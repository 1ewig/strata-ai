import { LanguageModelUsage } from 'ai';

/**
 * Metadata attached to assistant messages via the AI SDK `messageMetadata`
 * stream option. Carries the provider-reported token usage for the run so the
 * client never needs a character-based token estimator.
 */
export interface ChatMetadata {
  usage?: LanguageModelUsage;
  modelId?: string;
}

/** Cumulative token usage across a conversation's assistant messages. */
export interface CumulativeUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Folds the provider-reported usage from every assistant message into a single
 * cumulative total. Uses `usage.totalTokens` when present, falling back to
 * `inputTokens + outputTokens`.
 * @param messages - The conversation's UI messages, each typed with ChatMetadata.
 * @returns Cumulative usage, or null before any real provider usage exists.
 */
export function computeCumulativeUsage(messages: Array<{ role?: string; metadata?: ChatMetadata }> | undefined): CumulativeUsage | null {
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;

  if (!messages || messages.length === 0) return null;

  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    const usage = m.metadata?.usage;
    if (!usage) continue;
    const input = usage.inputTokens ?? 0;
    const output = usage.outputTokens ?? 0;
    inputTokens += input;
    outputTokens += output;
    totalTokens += usage.totalTokens ?? input + output;
  }

  return totalTokens > 0 ? { inputTokens, outputTokens, totalTokens } : null;
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