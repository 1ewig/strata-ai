import { WorkspaceFile } from '@/lib/schemas';

/**
 * Minimal structural contract for chat messages when estimating token usage.
 * Accepts the subset of AI SDK UIMessage fields the estimator reads, so both
 * live session messages and persisted DBMessage rows can be passed in.
 */
export interface TokenUsageMessage {
  content?: unknown;
  parts?: Array<{
    type?: string;
    text?: string;
    reasoning?: string;
    toolInvocation?: unknown;
    toolCall?: unknown;
  }>;
}

/** Result of estimating how much of a model's context window a chat has used. */
export interface TokenUsageMetrics {
  estimatedTokens: number;
  contextWindow: number;
  percentage: string;
  formattedTokens: string;
  formattedContextWindow: string;
}

/**
 * Counts the approximate character payload of a chat: workspace file contents
 * plus message text, reasoning, and tool execution payloads.
 * @param files - Workspace files whose contents count toward the window.
 * @param messages - Chat messages to measure.
 * @returns Total estimated characters.
 */
export function countCharacterTokens(files: WorkspaceFile[] | undefined, messages: TokenUsageMessage[] | undefined): number {
  let charCount = 0;

  if (files && files.length > 0) {
    for (const f of files) {
      if (f.content) charCount += f.content.length;
    }
  }

  if (messages && messages.length > 0) {
    for (const m of messages) {
      if (typeof m.content === 'string') {
        charCount += m.content.length;
      }
      if (Array.isArray(m.parts)) {
        for (const p of m.parts) {
          if (p.type === 'text' && typeof p.text === 'string') {
            charCount += p.text.length;
          } else if (p.type === 'reasoning' && typeof p.reasoning === 'string') {
            charCount += p.reasoning.length;
          } else if (p.type === 'tool-invocation' || p.type === 'tool-call') {
            charCount += JSON.stringify(p.toolInvocation || p.toolCall || p).length;
          }
        }
      }
    }
  }

  return charCount;
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
 * Estimates how much of a model's context window the current chat has used,
 * using the standard LLM heuristic of ~4 characters per token.
 * @param files - Workspace files to measure.
 * @param messages - Chat messages to measure.
 * @param contextWindow - The active model's context window size in tokens.
 * @returns Token usage metrics with formatted display values.
 */
export function computeTokenUsage(
  files: WorkspaceFile[] | undefined,
  messages: TokenUsageMessage[] | undefined,
  contextWindow: number,
): TokenUsageMetrics {
  const charCount = countCharacterTokens(files, messages);
  const estimatedTokens = Math.ceil(charCount / 4);
  const pct = Math.min(100, (estimatedTokens / contextWindow) * 100);

  return {
    estimatedTokens,
    contextWindow,
    percentage: pct < 0.1 && estimatedTokens > 0 ? '<0.1' : pct.toFixed(1),
    formattedTokens: formatTokens(estimatedTokens),
    formattedContextWindow: formatContextWindow(contextWindow),
  };
}
