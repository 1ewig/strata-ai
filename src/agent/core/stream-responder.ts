import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  smoothStream,
  createUIMessageStream,
  type LanguageModelUsage,
} from "ai";
import { resolveAgentModel, getModelProvider, DEFAULT_AGENT_MODEL } from "../providers";
import type { WorkspaceToolsContext } from "../tools/types";
import { getModelSupportsVision } from "@/lib/ai/models";
import {
  sanitizeMessagesForProvider,
  stripImageContentForUnsupportedModels,
} from "../sanitization";
import { coalesceToolInputDeltas } from "./transforms";
import { handleRunnerError } from "./runner-error";
import { propagateAttributes } from "@langfuse/tracing";
import { langfuseSpanProcessor } from "@/instrumentation";

/**
 * Configuration for `createUIStreamResponder`: the deltas between the agent and
 * context-compaction runs layered onto the shared streaming wiring.
 */
export interface UIStreamResponderConfig {
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
export async function createUIStreamResponder(config: UIStreamResponderConfig): Promise<Response> {
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
                  void langfuseSpanProcessor.forceFlush().catch((err) => {
                    console.warn(`${config.prefix} Langfuse span flush error:`, err);
                  });
                },
                onError({ error }) {
                  void handleRunnerError({
                    err: error,
                    phase: "Stream error",
                    prefix: config.prefix,
                    writer,
                    triggerInferenceError,
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
          await handleRunnerError({
            err: execError,
            phase: "Execution error",
            prefix: config.prefix,
            writer,
            triggerInferenceError,
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
    await handleRunnerError({
      err: setupError,
      phase: "Responder setup error",
      prefix: config.prefix,
      triggerInferenceError,
    });
    throw setupError;
  }
}
