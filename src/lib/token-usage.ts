import { LanguageModelUsage } from 'ai';

/**
 * Metadata attached to assistant messages via the AI SDK `messageMetadata`
 * stream option. Carries the provider-reported token usage for the run so the
 * client never needs a character-based token estimator.
 */
export interface ChatMetadata {
  /** Active context window usage snapshot at the completion of this turn. */
  usage?: LanguageModelUsage;
  /** Aggregate multi-step API execution tokens across all tool iterations in this turn. */
  stepTotalUsage?: LanguageModelUsage;
  modelId?: string;
  /** True when this message represents an automated context compaction summary. */
  isCompactedSummary?: boolean;
}

/** Active context window usage for the current conversation state. */
export interface ActiveContextUsage {
  /** Prompt tokens (system prompt + workspace metadata + history + latest prompt). */
  inputTokens: number;
  /** Generated tokens in the latest assistant response. */
  outputTokens: number;
  /** Total tokens currently occupying the context window (input + output). */
  totalTokens: number;
  /** Percentage of the model's context window consumed (0 - 100). */
  percentUsed: number;
  /** Remaining headroom in tokens before hitting the context window limit. */
  remainingTokens: number;
}

import { MODELS, getModelPricing } from '@/lib/models';

/** Per-model token volume and cost breakdown for a conversation. */
export interface ModelUsageStats {
  modelId: string;
  modelLabel: string;
  turnCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  apiTokens: number;
  cost: number;
}

/** Cumulative session metrics across the conversation lifetime. */
export interface SessionTokenUsage {
  /** Sum of all generated assistant tokens in this conversation. */
  totalOutputTokens: number;
  /** Sum of all API tokens processed across all turns. */
  totalApiTokens: number;
  /** Total number of assistant turns with reported usage. */
  turnCount: number;
}

/** Unified token metrics combining active context, session metrics, and dollar cost breakdown. */
export interface ConversationTokenMetrics {
  /** Active context window utilization (Claude Code / OpenCode / Codex standard). */
  active: ActiveContextUsage;
  /** Lifetime session output and API metrics. */
  session: SessionTokenUsage;
  /** Total estimated dollar cost across all turns and models in this conversation. */
  totalCost: number;
  /** Distinct list of model labels used in this conversation. */
  modelsUsed: string[];
  /** Detailed token and dollar cost breakdown grouped by model. */
  modelBreakdowns: ModelUsageStats[];
  /** Backward-compatibility aliases mapping to active context. */
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Calculates the dollar cost for a specific model based on input and output tokens.
 * @param modelId - The model ID used for inference.
 * @param inputTokens - Prompt and context input tokens.
 * @param outputTokens - Generated output and reasoning tokens.
 */
export function calculateTokenCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPricing(modelId);
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  return inputCost + outputCost;
}

/**
 * Formats a dollar cost for compact UI display (e.g. "$0.0014" or "<$0.0001").
 * @param costInUSD - Cost in US dollars.
 */
export function formatCost(costInUSD: number): string {
  if (!costInUSD || costInUSD <= 0) return '$0.00';
  if (costInUSD < 0.0001) return '<$0.0001';
  if (costInUSD < 0.01) return `$${costInUSD.toFixed(4)}`;
  return `$${costInUSD.toFixed(3)}`;
}

/** Legacy cumulative usage type maintained for backward compatibility. */
export interface CumulativeUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Calculates accurate token metrics for a conversation adhering to the
 * Claude Code / OpenCode / Codex active context window paradigm, and groups
 * costs and token volume by model.
 *
 * @param messages - UI messages array containing assistant turns with ChatMetadata.
 * @param contextWindow - Active model's context window limit (e.g. 131,072 tokens).
 * @returns ConversationTokenMetrics or null when no usage has been recorded yet.
 */
export function calculateTokenMetrics(
  messages: Array<{ role?: string; metadata?: ChatMetadata }> | undefined,
  contextWindow: number = 131072,
): ConversationTokenMetrics | null {
  if (!messages || messages.length === 0) return null;

  let latestUsage: LanguageModelUsage | null = null;
  let isLatestTurnCompacted = false;
  let totalOutputTokens = 0;
  let totalApiTokens = 0;
  let totalCost = 0;
  let turnCount = 0;

  const modelStatsMap = new Map<string, {
    turnCount: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    apiTokens: number;
    cost: number;
  }>();

  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    const usage = m.metadata?.usage;
    if (!usage) continue;

    latestUsage = usage;
    isLatestTurnCompacted = m.metadata?.isCompactedSummary === true;
    turnCount += 1;

    const input = usage.inputTokens ?? 0;
    const output = usage.outputTokens ?? 0;
    const total = usage.totalTokens ?? input + output;
    const apiTotal = m.metadata?.stepTotalUsage?.totalTokens ?? total;
    const modelId = m.metadata?.modelId || 'gemini-3.5-flash-lite';

    totalOutputTokens += output;
    totalApiTokens += apiTotal;

    // Multi-step tool calls consume apiTotal tokens across passes; we compute cost from execution usage
    const stepUsage = m.metadata?.stepTotalUsage;
    const stepInput = stepUsage?.inputTokens ?? input;
    const stepOutput = stepUsage?.outputTokens ?? output;
    const turnCost = calculateTokenCost(modelId, stepInput, stepOutput);
    totalCost += turnCost;

    const existing = modelStatsMap.get(modelId) || {
      turnCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      apiTokens: 0,
      cost: 0,
    };

    existing.turnCount += 1;
    existing.inputTokens += stepInput;
    existing.outputTokens += stepOutput;
    existing.totalTokens += stepInput + stepOutput;
    existing.apiTokens += apiTotal;
    existing.cost += turnCost;

    modelStatsMap.set(modelId, existing);
  }

  if (!latestUsage) return null;

  let activeInput = latestUsage.inputTokens ?? 0;
  let activeOutput = latestUsage.outputTokens ?? 0;

  // When the latest assistant message is a context compaction summary, active context
  // resets to the baseline system context plus the summary length, dropping the discarded history.
  if (isLatestTurnCompacted) {
    activeInput = 1000;
    activeOutput = latestUsage.outputTokens ?? 1000;
  }

  const activeTotal = isLatestTurnCompacted
    ? activeInput + activeOutput
    : latestUsage.totalTokens ?? activeInput + activeOutput;

  if (activeTotal <= 0) return null;

  const safeWindow = Math.max(contextWindow, 1);
  const percentUsed = Math.min(100, (activeTotal / safeWindow) * 100);
  const remainingTokens = Math.max(0, contextWindow - activeTotal);

  const active: ActiveContextUsage = {
    inputTokens: activeInput,
    outputTokens: activeOutput,
    totalTokens: activeTotal,
    percentUsed,
    remainingTokens,
  };

  const session: SessionTokenUsage = {
    totalOutputTokens,
    totalApiTokens,
    turnCount,
  };

  const modelBreakdowns: ModelUsageStats[] = Array.from(modelStatsMap.entries()).map(
    ([id, stats]) => {
      const option = MODELS.find((m) => m.id === id);
      const modelLabel = option?.label || id;
      return {
        modelId: id,
        modelLabel,
        ...stats,
      };
    }
  );

  const modelsUsed = modelBreakdowns.map((m) => m.modelLabel);

  return {
    active,
    session,
    totalCost,
    modelsUsed,
    modelBreakdowns,
    inputTokens: activeInput,
    outputTokens: activeOutput,
    totalTokens: activeTotal,
  };
}

/**
 * Backward-compatible helper that delegates to calculateTokenMetrics and returns
 * active context window usage.
 *
 * @param messages - The conversation's UI messages, each typed with ChatMetadata.
 * @param contextWindow - Optional context window for calculations.
 * @returns ConversationTokenMetrics (representing active context), or null before any real provider usage exists.
 */
export function computeCumulativeUsage(
  messages: Array<{ role?: string; metadata?: ChatMetadata }> | undefined,
  contextWindow: number = 131072,
): ConversationTokenMetrics | null {
  return calculateTokenMetrics(messages, contextWindow);
}

/**
 * Formats a raw token count into a compact display string (e.g. 842, "1.2k", "3.4M").
 * @param count - Raw token count.
 * @returns Compact token label.
 */
export function formatTokens(count: number): string {
  return count < 1000
    ? String(count)
    : count < 1000000
      ? `${(count / 1000).toFixed(1)}k`
      : `${(count / 1000000).toFixed(2)}M`;
}

/**
 * Formats a context window token limit into a compact display string (e.g. "131k", "1.0M").
 * @param contextWindow - Context window size in tokens.
 * @returns Compact context window label.
 */
export function formatContextWindow(contextWindow: number): string {
  return contextWindow >= 1000000
    ? `${(contextWindow / 1000000).toFixed(1)}M`
    : `${Math.round(contextWindow / 1000)}k`;
}

/**
 * Finds the index of the latest compaction summary message in a messages array.
 * @param messages - Array of messages to search.
 * @returns The index of the latest compaction summary message, or -1 if none exists.
 */
export function findLatestCompactedMessageIndex(
  messages: Array<{ metadata?: ChatMetadata; [key: string]: any }> | undefined,
): number {
  if (!messages || messages.length === 0) return -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.metadata?.isCompactedSummary === true) {
      return i;
    }
  }
  return -1;
}