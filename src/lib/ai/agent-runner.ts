import {
  streamText,
  isStepCount,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  smoothStream,
  createUIMessageStream,
  LanguageModelUsage,
} from "ai";
import {
  buildSystemInstruction,
  buildCompactionInstruction,
  createWorkspaceTools,
} from "@/lib/ai";
import { resolveAgentModel, getModelProvider, DEFAULT_AGENT_MODEL } from "@/lib/ai/providers";
import { WorkspaceToolsContext } from "@/lib/ai/tools/types";
import { WorkspaceFile } from "@/lib/schemas";
import { getModelContextWindow } from "@/lib/models";
import { calculateTokenMetrics, ChatMetadata } from "@/lib/token-usage";

/**
 * Strips provider-specific metadata from conversation messages that belongs to a
 * provider other than the one serving the current request.
 *
 * Prevents cross-provider metadata leaks that break strict-schema providers.
 * The classic failure: a Gemini (Google) tool-call part carries a stored thought
 * signature (UI `callProviderMetadata.google.thoughtSignature`); when that
 * history is later replayed into a Fireworks/DeepSeek request,
 * `convertToModelMessages` re-emits it as `providerOptions` on the tool-call
 * part and the openai-compatible converter turns it into `extra_content`, which
 * Fireworks rejects with:
 * "Extra inputs are not permitted, field: 'messages[N].tool_calls[0].extra_content'".
 * Keeping the active provider's own keys is intentional so Google's thought
 * signatures still round-trip for Gemini requests.
 *
 * All three metadata field shapes are pruned: `providerMetadata` (text/reasoning
 * parts), `callProviderMetadata` / `resultProviderMetadata` (tool parts).
 *
 * @param messages - The UI message parts arriving in the request body.
 * @param provider - The active backend provider ('google' | 'fireworks').
 * @returns A shallow-copied message array with non-active provider metadata pruned.
 */
function sanitizeMessagesForProvider(
  messages: Parameters<typeof convertToModelMessages>[0],
  provider: "google" | "fireworks",
): Parameters<typeof convertToModelMessages>[0] {
  const prune = (metadata?: Record<string, unknown>) => {
    if (!metadata) {
      return undefined;
    }
    const pruned = Object.fromEntries(
      Object.entries(metadata).filter(([key]) => key === provider),
    );
    return Object.keys(pruned).length > 0 ? pruned : undefined;
  };

  return messages.map((message) => {
    const parts = message.parts;
    if (!Array.isArray(parts)) {
      return message;
    }
    return {
      ...message,
      parts: parts.map((part) => {
        const typedPart = part as {
          providerMetadata?: Record<string, unknown>;
          callProviderMetadata?: Record<string, unknown>;
          resultProviderMetadata?: Record<string, unknown>;
        };
        return {
          ...part,
          ...(typedPart.providerMetadata !== undefined
            ? { providerMetadata: prune(typedPart.providerMetadata) }
            : {}),
          ...(typedPart.callProviderMetadata !== undefined
            ? { callProviderMetadata: prune(typedPart.callProviderMetadata) }
            : {}),
          ...(typedPart.resultProviderMetadata !== undefined
            ? { resultProviderMetadata: prune(typedPart.resultProviderMetadata) }
            : {}),
        };
      }),
    };
  }) as Parameters<typeof convertToModelMessages>[0];
}

/**
 * Server-side agent run configuration.
 * @property workspace - The per-request mutable workspace bound to the request body.
 * @property messages - The conversation messages to feed the model.
 * @property modelId - Optional catalog model id; defaults to the lite Gemini model.
 * @property thinkingLevel - Optional thinking effort requested by the client.
 * @property maxSteps - Hard cap on agent tool-loop steps (already clamped).
 * @property signal - Optional abort signal tied to the incoming request.
 * @property remaining5h - Remaining 5-hour message quota, echoed as a header.
 * @property remainingWeek - Remaining weekly message quota, echoed as a header.
 */
export interface RunAgentResponseParams {
  workspace: WorkspaceToolsContext;
  messages: Parameters<typeof convertToModelMessages>[0];
  modelId?: string;
  thinkingLevel?: string;
  maxSteps: number;
  signal?: AbortSignal;
  remaining5h: number;
  remainingWeek: number;
}

/**
 * Server-side stream transform that buffers and coalesces `tool-input-delta` chunks
 * per tool call before emitting them to the client.
 *
 * Prevents client-side UI freezes caused by AI SDK 7's message reducer running O(N * length)
 * `parsePartialJson` + `fixJson()` operations on every token chunk of large tool arguments.
 */
function coalesceToolInputDeltas() {
  return () => {
    const buffers = new Map<
      string,
      { delta: string; chunkCount: number; providerMetadata?: unknown }
    >();

    function flush(id: string, controller: TransformStreamDefaultController) {
      const entry = buffers.get(id);
      if (entry && entry.delta.length > 0) {
        console.log(
          `[agent] Coalesced tool-input-delta for tool call "${id}": ${entry.delta.length} chars across ${entry.chunkCount} chunks.`
        );
        controller.enqueue({
          type: "tool-input-delta",
          id,
          delta: entry.delta,
          ...(entry.providerMetadata ? { providerMetadata: entry.providerMetadata } : {}),
        });
        buffers.delete(id);
      }
    }

    return new TransformStream({
      async transform(chunk: any, controller) {
        if (chunk.type === "tool-input-delta") {
          const existing = buffers.get(chunk.id);
          if (existing) {
            existing.delta += chunk.delta;
            existing.chunkCount += 1;
            if (chunk.providerMetadata) {
              existing.providerMetadata = chunk.providerMetadata;
            }
          } else {
            buffers.set(chunk.id, {
              delta: chunk.delta,
              chunkCount: 1,
              providerMetadata: chunk.providerMetadata,
            });
          }
          return;
        }

        if ((chunk.type === "tool-input-end" || chunk.type === "tool-call") && chunk.id) {
          flush(chunk.id, controller);
        }

        controller.enqueue(chunk);
      },
      async flush(controller) {
        for (const id of Array.from(buffers.keys())) {
          flush(id, controller);
        }
      },
    });
  };
}

/**
 * Builds and returns the streaming UI-message response for an agent run.
 *
 * Encapsulates every piece of `streamText` configuration (model resolution,
 * system prompt re-injection per step, tool wiring, streaming transform, step
 * cap, and lifecycle logging) plus the SSE wrapping and quota headers, so the
 * API route stays a thin HTTP/security/validation shell.
 *
 * @param params - The resolved model, messages, workspace, and quota data.
 * @returns The SSE UI-message streaming `Response`.
 */
export async function runAgentResponse({
  workspace,
  messages,
  modelId,
  thinkingLevel,
  maxSteps,
  signal,
  remaining5h,
  remainingWeek,
}: RunAgentResponseParams): Promise<Response> {
  // Token budget: active model's context window + active context occupancy from the
  // latest assistant message (metadata.usage round-trips through the request body).
  const contextWindow = getModelContextWindow(modelId || DEFAULT_AGENT_MODEL);
  const tokenMetrics = calculateTokenMetrics(
    sanitizeMessagesForProvider(messages, getModelProvider(modelId || DEFAULT_AGENT_MODEL)) as Array<{
      role?: string;
      metadata?: ChatMetadata;
    }>,
    contextWindow,
  );
  const tokenBudget = {
    contextWindow,
    totalTokens: tokenMetrics?.active.totalTokens,
    remainingTokens: tokenMetrics?.active.remainingTokens,
    percentUsed: tokenMetrics?.active.percentUsed,
  };

  return createUIStreamResponder({
    prefix: "[agent]",
    messages,
    modelId,
    thinkingLevel,
    signal,
    remaining5h,
    remainingWeek,
    initialSystem: buildSystemInstruction(workspace.getCurrentFiles()),
    buildTools: (writer) => createWorkspaceTools({ ...workspace, writer }),
    stopWhen: isStepCount(maxSteps),
    prepareStep: async ({ stepNumber }) => {
      console.log(
        `[agent] Preparing step ${stepNumber}. Active workspace files: ${workspace.getCurrentFiles().length}`
      );
      return {
        system: buildSystemInstruction(workspace.getCurrentFiles(), tokenBudget),
      };
    },
  });
}

/**
 * Configuration for `createUIStreamResponder`: the deltas between the agent and
 * context-compaction runs layered onto the shared streaming wiring.
 * @property prefix - Lifecycle log prefix ("[agent]" or "[compaction]").
 * @property messages - Conversation messages to feed the model.
 * @property modelId - Optional catalog model id; defaults to the lite Gemini model.
 * @property thinkingLevel - Optional thinking effort requested by the client.
 * @property signal - Optional abort signal tied to the incoming request.
 * @property remaining5h / remainingWeek - Quota echoed as response headers.
 * @property initialSystem - System prompt emitted with the initial step.
 * @property buildTools - Optional factory producing tools bound to the live writer.
 * @property prepareStep - Optional system re-injection hook between agent steps.
 * @property stopWhen - Optional agent tool-loop step cap.
 * @property maxOutputTokens - Optional output cap (compaction).
 * @property appendUserMessage - Optional user turn appended after converted history.
 * @property extraMetadata - Extra metadata merged onto the finished assistant message.
 */
interface UIStreamResponderConfig {
  prefix: string;
  messages: Parameters<typeof convertToModelMessages>[0];
  modelId?: string;
  thinkingLevel?: string;
  signal?: AbortSignal;
  remaining5h?: number;
  remainingWeek?: number;
  initialSystem: string;
  buildTools?: (
    writer: NonNullable<WorkspaceToolsContext["writer"]>,
  ) => Parameters<typeof streamText>[0]["tools"];
  prepareStep?: Parameters<typeof streamText>[0]["prepareStep"];
  stopWhen?: Parameters<typeof streamText>[0]["stopWhen"];
  maxOutputTokens?: number;
  appendUserMessage?: string;
  extraMetadata?: Record<string, unknown>;
}

/**
 * Builds and returns the SSE UI-message streaming response for a model run,
 * collapsing the shared `streamText` configuration (model resolution, provider
 * metadata sanitization, reasoning/providerOptions wiring, word-paced
 * `smoothStream` + tool-input coalescing, lifecycle logging) and the
 * `createUIMessageStream` → `toUIMessageStream` + usage `messageMetadata` +
 * quota-header SSE wrapping used by both the agent and compaction paths.
 *
 * @param config - The resolved deltas for this run.
 * @returns The SSE UI-message streaming `Response`.
 */
async function createUIStreamResponder(config: UIStreamResponderConfig): Promise<Response> {
  const { modelId, thinkingLevel } = config;

  // Resolve the requested model to its provider-specific config (Google or Fireworks).
  const resolvedModel = resolveAgentModel(modelId || DEFAULT_AGENT_MODEL, thinkingLevel);

  // Prune provider metadata belonging to other providers before the message
  // converters run, so stale Gemini thought signatures (or any other
  // cross-provider leftovers) never leak into a Fireworks/DeepSeek payload.
  const sanitizedMessages = sanitizeMessagesForProvider(
    config.messages,
    getModelProvider(modelId || DEFAULT_AGENT_MODEL),
  );

  // Convert once up front (optional trailing user turn appended for compaction).
  const modelMessages = config.appendUserMessage
    ? [
        ...(await convertToModelMessages(sanitizedMessages)),
        { role: "user" as const, content: config.appendUserMessage },
      ]
    : await convertToModelMessages(sanitizedMessages);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      let lastStepUsage: LanguageModelUsage | undefined;

      const result = streamText({
        model: resolvedModel.model,
        ...(resolvedModel.reasoning !== undefined
          ? { reasoning: resolvedModel.reasoning as Parameters<typeof streamText>[0]["reasoning"] }
          : {}),
        ...(resolvedModel.providerOptions ? { providerOptions: resolvedModel.providerOptions } : {}),
        system: config.initialSystem,
        messages: modelMessages,
        ...(config.buildTools ? { tools: config.buildTools(writer) } : {}),
        abortSignal: config.signal,
        ...(config.maxOutputTokens !== undefined ? { maxOutputTokens: config.maxOutputTokens } : {}),
        experimental_transform: [
          smoothStream({
            delayInMs: 25,
            chunking: "word",
          }),
          coalesceToolInputDeltas() as any,
        ],
        ...(config.prepareStep ? { prepareStep: config.prepareStep } : {}),
        ...(config.stopWhen ? { stopWhen: config.stopWhen } : {}),
        onStart() {
          console.log(`${config.prefix} Generation stream started.`);
        },
        onStepEnd({ stepNumber, toolCalls, usage }) {
          if (usage) {
            lastStepUsage = usage;
          }
          console.log(
            `${config.prefix} Step ${stepNumber} completed. Tool calls: ${toolCalls?.length || 0}`
          );
        },
        onEnd({ finishReason, usage }) {
          console.log(
            `${config.prefix} Stream finished (${finishReason}). Total token usage:`,
            usage
          );
        },
        onError({ error }) {
          console.error(`${config.prefix} Stream error:`, error);
        },
      });

      writer.merge(
        toUIMessageStream({
          stream: result.stream,
          messageMetadata: ({ part }) => {
            // Attach the provider-reported usage to the finished assistant message.
            // Following Claude Code / OpenCode / Codex standard, we record the final step's
            // usage as the active conversation context snapshot (avoiding multi-step N-pass inflation),
            // while preserving stepTotalUsage for cumulative session analytics.
            if (part.type === "finish") {
              return {
                ...(config.extraMetadata ?? {}),
                usage: lastStepUsage || part.totalUsage,
                stepTotalUsage: part.totalUsage,
                modelId: modelId || DEFAULT_AGENT_MODEL,
              };
            }
            return undefined;
          },
        })
      );
    },
  });

  // Wrap the UI message stream and attach quota headers.
  return createUIMessageStreamResponse({
    stream,
    headers: {
      ...(config.remaining5h !== undefined
        ? { "X-RateLimit-Remaining-5h": String(config.remaining5h) }
        : {}),
      ...(config.remainingWeek !== undefined
        ? { "X-RateLimit-Remaining-Week": String(config.remainingWeek) }
        : {}),
    },
  });
}

/**
 * Server-side compaction run configuration.
 * @property files - The workspace files to reference in the compaction prompt.
 * @property messages - The conversation messages to summarize.
 * @property modelId - Optional catalog model id; defaults to the lite Gemini model.
 * @property thinkingLevel - Optional thinking effort requested by the client.
 * @property signal - Optional abort signal tied to the incoming request.
 */
export interface RunCompactionResponseParams {
  files?: WorkspaceFile[];
  messages: Parameters<typeof convertToModelMessages>[0];
  modelId?: string;
  thinkingLevel?: string;
  signal?: AbortSignal;
  remaining5h?: number;
  remainingWeek?: number;
}

/**
 * Builds and returns the streaming UI-message response for a context compaction run.
 *
 * @param params - The resolved model, messages, files, and abort signal.
 * @returns The SSE UI-message streaming `Response`.
 */
export async function runCompactionResponse({
  files,
  messages,
  modelId,
  thinkingLevel,
  signal,
  remaining5h,
  remainingWeek,
}: RunCompactionResponseParams): Promise<Response> {
  return createUIStreamResponder({
    prefix: "[compaction]",
    messages,
    modelId,
    thinkingLevel,
    signal,
    remaining5h,
    remainingWeek,
    initialSystem: buildCompactionInstruction(files),
    maxOutputTokens: 2500,
    appendUserMessage:
      "Please generate the comprehensive context compaction summary for the conversation and workspace state above now, following the required structured format.",
    extraMetadata: { isCompactedSummary: true },
  });
}