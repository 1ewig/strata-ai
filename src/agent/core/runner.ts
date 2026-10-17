import {
  streamText,
  isStepCount,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  smoothStream,
  createUIMessageStream,
  type LanguageModelUsage,
} from "ai";
import {
  buildSystemInstruction,
  buildCompactionInstruction,
} from "../prompts";
import { createWorkspaceTools } from "../tools";
import { resolveAgentModel, getModelProvider, DEFAULT_AGENT_MODEL } from "../providers";
import type { WorkspaceToolsContext } from "../tools/types";
import type { WorkspaceFile } from "@/lib/schemas";
import {
  getModelContextWindow,
  getModelSupportsVision,
  COMPACTION_MODEL_ID,
  COMPACTION_THINKING_LEVEL,
} from "@/lib/models";
import { calculateTokenMetrics, type ChatMetadata } from "@/lib/token-usage";
import {
  sanitizeMessagesForProvider,
  stripImageContentForUnsupportedModels,
} from "../sanitization";
import { coalesceToolInputDeltas } from "./transforms";
import { classifyProviderError } from "./error-classifier";
import { propagateAttributes } from "@langfuse/tracing";
import { langfuseSpanProcessor } from "@/instrumentation";

// Re-export sanitization helpers for convenience
export {
  sanitizeMessagesForProvider,
  stripImageContentForUnsupportedModels,
} from "../sanitization";

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
 * @property userId - Optional authenticated user ID for trace attribution.
 * @property sessionId - Optional conversation / chat ID for trace session grouping.
 * @property onInferenceError - Optional callback invoked when stream or generation encounters an error.
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
  userId?: string;
  sessionId?: string;
  onInferenceError?: (error: unknown) => Promise<void> | void;
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
  userId,
  sessionId,
  onInferenceError,
}: RunAgentResponseParams): Promise<Response> {
  // Token budget: active model's context window + active context occupancy from the
  // latest assistant message (metadata.usage round-trips through the request body).
  const contextWindow = getModelContextWindow(modelId || DEFAULT_AGENT_MODEL);
  const activeModelId = modelId || DEFAULT_AGENT_MODEL;
  const supportsVision = getModelSupportsVision(activeModelId);
  const sanitizedForMetrics = await sanitizeMessagesForProvider(
    messages,
    getModelProvider(activeModelId),
    supportsVision,
  );
  const tokenMetrics = calculateTokenMetrics(
    sanitizedForMetrics as Array<{
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
    userId,
    sessionId,
    onInferenceError,
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
 */
interface UIStreamResponderConfig {
  prefix: string;
  messages: Parameters<typeof convertToModelMessages>[0];
  modelId?: string;
  thinkingLevel?: string;
  signal?: AbortSignal;
  remaining5h?: number;
  remainingWeek?: number;
  userId?: string;
  sessionId?: string;
  initialSystem: string;
  buildTools?: (
    writer: NonNullable<WorkspaceToolsContext["writer"]>,
  ) => Parameters<typeof streamText>[0]["tools"];
  prepareStep?: Parameters<typeof streamText>[0]["prepareStep"];
  stopWhen?: Parameters<typeof streamText>[0]["stopWhen"];
  maxOutputTokens?: number;
  appendUserMessage?: string;
  extraMetadata?: Record<string, unknown>;
  onInferenceError?: (error: unknown) => Promise<void> | void;
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

  let hasTriggeredInferenceError = false;
  const triggerInferenceError = async (err: unknown) => {
    if (hasTriggeredInferenceError) return;
    hasTriggeredInferenceError = true;
    if (config.onInferenceError) {
      try {
        await config.onInferenceError(err);
      } catch (callbackError) {
        console.error(`${config.prefix} Failed to execute onInferenceError callback:`, callbackError);
      }
    }
  };

  try {
    const activeModelId = modelId || DEFAULT_AGENT_MODEL;
    const provider = getModelProvider(activeModelId);
    const supportsVision = getModelSupportsVision(activeModelId);

    // Resolve the requested model to its provider-specific config (Google or Fireworks).
    const resolvedModel = resolveAgentModel(activeModelId, thinkingLevel);

    // Prune provider metadata belonging to other providers before the message
    // converters run, so stale Gemini thought signatures (or any other
    // cross-provider leftovers) never leak into a Fireworks payload.
    const sanitizedMessages = await sanitizeMessagesForProvider(
      config.messages,
      provider,
      supportsVision,
    );

    // Convert once up front (optional trailing user turn appended for compaction).
    const convertedMessages = await convertToModelMessages(sanitizedMessages);
    // Text-only models cannot consume image content; strip it from replayed
    // history so old image conversations stay usable.
    const modelMessages = config.appendUserMessage
      ? [
          ...stripImageContentForUnsupportedModels(convertedMessages, supportsVision),
          { role: "user" as const, content: config.appendUserMessage },
        ]
      : stripImageContentForUnsupportedModels(convertedMessages, supportsVision);

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          await propagateAttributes(
            {
              traceName: config.prefix === "[compaction]" ? "context-compaction" : "agent-workspace",
              userId: config.userId,
              sessionId: config.sessionId,
              tags: [
                "strata-ai",
                config.prefix === "[compaction]" ? "compaction" : "agent",
                provider,
              ],
              metadata: {
                modelId: activeModelId,
                thinkingLevel: thinkingLevel || "default",
              },
            },
            async () => {
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
                telemetry: {
                  functionId: config.prefix === "[compaction]" ? "compaction-response" : "agent-response",
                },
                experimental_transform: [
                  smoothStream({
                    delayInMs: 15,
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
                  void langfuseSpanProcessor.forceFlush().catch((err) => {
                    console.warn(`${config.prefix} Langfuse span flush error:`, err);
                  });
                },
                onError({ error }) {
                  const classified = classifyProviderError(error);
                  console.error(`${config.prefix} Stream error [${classified.code}]:`, error);
                  void triggerInferenceError(classified);
                  try {
                    writer.write({
                      type: "error",
                      errorText: classified.message,
                    });
                  } catch {
                    // Writer might already be closed
                  }
                  void langfuseSpanProcessor.forceFlush().catch((err) => {
                    console.warn(`${config.prefix} Langfuse span flush error:`, err);
                  });
                },
              });

              writer.merge(
                toUIMessageStream({
                  stream: result.stream,
                  messageMetadata: ({ part }) => {
                    // Attach the provider-reported usage to the finished assistant message.
                    if (part.type === "finish") {
                      return {
                        ...config.extraMetadata,
                        usage: lastStepUsage || part.totalUsage,
                        stepTotalUsage: part.totalUsage,
                        modelId: modelId || DEFAULT_AGENT_MODEL,
                      };
                    }
                    return undefined;
                  },
                })
              );
            }
          );
        } catch (execError) {
          const classified = classifyProviderError(execError);
          console.error(`${config.prefix} Execution error [${classified.code}]:`, execError);
          await triggerInferenceError(classified);
          try {
            writer.write({
              type: "error",
              errorText: classified.message,
            });
          } catch {
            // Writer might already be closed
          }
          void langfuseSpanProcessor.forceFlush().catch((err) => {
            console.warn(`${config.prefix} Langfuse span flush error:`, err);
          });
          throw execError;
        }
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
  } catch (setupError) {
    console.error(`${config.prefix} Responder setup error:`, setupError);
    await triggerInferenceError(setupError);
    void langfuseSpanProcessor.forceFlush().catch((err) => {
      console.warn(`${config.prefix} Langfuse span flush error:`, err);
    });
    throw setupError;
  }
}

/**
 * Server-side compaction run configuration.
 */
export interface RunCompactionResponseParams {
  files?: WorkspaceFile[];
  messages: Parameters<typeof convertToModelMessages>[0];
  modelId?: string;
  thinkingLevel?: string;
  signal?: AbortSignal;
  remaining5h?: number;
  remainingWeek?: number;
  userId?: string;
  sessionId?: string;
  onInferenceError?: (error: unknown) => Promise<void> | void;
}

/**
 * Builds and returns the streaming UI-message response for a context compaction run.
 * Always utilizes the dedicated fast Gemini 3.1 Flash Lite model configured with
 * high reasoning effort for lossless, high-density summary synthesis.
 *
 * @param params - The resolved messages, files, abort signal, and quota headers.
 * @returns The SSE UI-message streaming `Response`.
 */
export async function runCompactionResponse({
  files,
  messages,
  signal,
  remaining5h,
  remainingWeek,
  userId,
  sessionId,
  onInferenceError,
}: RunCompactionResponseParams): Promise<Response> {
  return createUIStreamResponder({
    prefix: "[compaction]",
    messages,
    modelId: COMPACTION_MODEL_ID,
    thinkingLevel: COMPACTION_THINKING_LEVEL,
    signal,
    remaining5h,
    remainingWeek,
    userId,
    sessionId,
    onInferenceError,
    initialSystem: buildCompactionInstruction(files),
    maxOutputTokens: 3500,
    appendUserMessage:
      "Please generate the comprehensive context compaction summary for the conversation and workspace state above now, following the required structured format.",
    extraMetadata: { isCompactedSummary: true },
  });
}
