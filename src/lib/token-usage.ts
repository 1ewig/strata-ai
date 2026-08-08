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

/** Cumulative session metrics across the conversation lifetime. */
export interface SessionTokenUsage {
  /** Sum of all generated assistant tokens in this conversation. */
  totalOutputTokens: number;
  /** Sum of all API tokens processed across all turns. */
  totalApiTokens: number;
  /** Total number of assistant turns with reported usage. */
  turnCount: number;
}

/** Unified token metrics combining active context and session metrics. */
export interface ConversationTokenMetrics {
  /** Active context window utilization (Claude Code / OpenCode / Codex standard). */
  active: ActiveContextUsage;
  /** Lifetime session output and API metrics. */
  session: SessionTokenUsage;
  /** Backward-compatibility aliases mapping to active context. */
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/** Legacy cumulative usage type maintained for backward compatibility. */
export interface CumulativeUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Calculates accurate token metrics for a conversation adhering to the
 * Claude Code / OpenCode / Codex active context window paradigm.
 *
 * The current context window utilization is determined by the most recent
 * assistant message's input and output tokens, as the provider's input tokens
 * already encapsulate the entire conversation history and system instructions.
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
  let totalOutputTokens = 0;
  let totalApiTokens = 0;
  let turnCount = 0;

  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    const usage = m.metadata?.usage;
    if (!usage) continue;

    latestUsage = usage;
    turnCount += 1;

    const input = usage.inputTokens ?? 0;
    const output = usage.outputTokens ?? 0;
    const total = usage.totalTokens ?? input + output;

    totalOutputTokens += output;
    const apiTotal = m.metadata?.stepTotalUsage?.totalTokens ?? total;
    totalApiTokens += apiTotal;
  }

  if (!latestUsage) return null;

  const activeInput = latestUsage.inputTokens ?? 0;
  const activeOutput = latestUsage.outputTokens ?? 0;
  const activeTotal = latestUsage.totalTokens ?? activeInput + activeOutput;

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

  return {
    active,
    session,
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