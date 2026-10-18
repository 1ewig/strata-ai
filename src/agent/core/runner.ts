import { isStepCount, convertToModelMessages } from "ai";
import { buildSystemInstruction, buildCompactionInstruction } from "../prompts";
import { createWorkspaceTools } from "../tools";
import type { WorkspaceToolsContext } from "../tools/types";
import type { WorkspaceFile } from "@/lib/db/schemas";
import { COMPACTION_MODEL_ID, COMPACTION_THINKING_LEVEL } from "@/lib/ai/models";
import { computeTokenBudget } from "./token-budget";
import { createUIStreamResponder } from "./stream-responder";

// Re-export sanitization helpers for convenience
export {
  sanitizeMessagesForProvider,
  stripImageContentForUnsupportedModels,
} from "../sanitization";

/**
 * Server-side agent run configuration.
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
  const tokenBudget = await computeTokenBudget(messages, modelId);

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
