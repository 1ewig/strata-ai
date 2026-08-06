import {
  streamText,
  isStepCount,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  smoothStream,
  createUIMessageStream,
} from "ai";
import { buildSystemInstruction, createWorkspaceTools } from "@/lib/ai";
import { resolveAgentModel } from "@/lib/ai/providers";
import { WorkspaceToolsContext } from "@/lib/ai/tools/types";

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
  // Resolve the requested model to its provider-specific config (Google or Fireworks).
  const resolvedModel = resolveAgentModel(modelId || "gemini-3.5-flash-lite", thinkingLevel);

  // Wrap streamText with createUIMessageStream so tools can emit live data-workspace events.
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const workspaceWithWriter: WorkspaceToolsContext = {
        ...workspace,
        writer,
      };

      const result = streamText({
        model: resolvedModel.model,
        ...(resolvedModel.reasoning !== undefined
          ? { reasoning: resolvedModel.reasoning as Parameters<typeof streamText>[0]["reasoning"] }
          : {}),
        ...(resolvedModel.providerOptions ? { providerOptions: resolvedModel.providerOptions } : {}),
        system: buildSystemInstruction(workspaceWithWriter.getCurrentFiles()),
        messages: await convertToModelMessages(messages),
        tools: createWorkspaceTools(workspaceWithWriter),
        abortSignal: signal,
        experimental_transform: smoothStream({
          delayInMs: 25,
          chunking: "word",
        }),
        prepareStep: async ({ stepNumber }) => {
          console.log(
            `[agent] Preparing step ${stepNumber}. Active workspace files: ${workspaceWithWriter.getCurrentFiles().length}`
          );
          return {
            system: buildSystemInstruction(workspaceWithWriter.getCurrentFiles()),
          };
        },
        onStart() {
          console.log("[agent] Generation stream started.");
        },
        onStepEnd({ stepNumber, toolCalls }) {
          console.log(
            `[agent] Step ${stepNumber} completed. Tool calls: ${toolCalls?.length || 0}`
          );
        },
        onEnd({ finishReason, usage }) {
          console.log(
            `[agent] Stream finished (${finishReason}). Total token usage:`,
            usage
          );
        },
        onError({ error }) {
          console.error("[agent] Stream error:", error);
        },
        stopWhen: isStepCount(maxSteps),
      });

      writer.merge(toUIMessageStream({ stream: result.stream }));
    },
  });

  // Wrap the UI message stream and attach quota headers.
  return createUIMessageStreamResponse({
    stream,
    headers: {
      "X-RateLimit-Remaining-5h": String(remaining5h),
      "X-RateLimit-Remaining-Week": String(remainingWeek),
    },
  });
}