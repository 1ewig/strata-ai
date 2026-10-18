import type { convertToModelMessages } from "ai";
import { getModelContextWindow, getModelSupportsVision } from "@/lib/ai/models";
import { calculateTokenMetrics, type ChatMetadata } from "@/lib/ai/token-usage";
import { getModelProvider, DEFAULT_AGENT_MODEL } from "../providers";
import { sanitizeMessagesForProvider } from "../sanitization";

export interface TokenBudget {
  contextWindow: number;
  totalTokens?: number;
  remainingTokens?: number;
  percentUsed?: number;
}

/**
 * Computes active model context window occupancy and token budget from the
 * incoming message array and previous assistant usage metadata.
 */
export async function computeTokenBudget(
  messages: Parameters<typeof convertToModelMessages>[0],
  modelId?: string,
): Promise<TokenBudget> {
  const activeModelId = modelId || DEFAULT_AGENT_MODEL;
  const contextWindow = getModelContextWindow(activeModelId);
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

  return {
    contextWindow,
    totalTokens: tokenMetrics?.active.totalTokens,
    remainingTokens: tokenMetrics?.active.remainingTokens,
    percentUsed: tokenMetrics?.active.percentUsed,
  };
}
