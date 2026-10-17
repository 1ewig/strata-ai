/**
 * Token-budget context shared with the model so it can size replies and flag
 * when a conversation is nearing its context-window ceiling.
 */
export interface TokenBudgetContext {
  /** The active model's context window in tokens. */
  contextWindow?: number;
  /** Active tokens occupying the context window (input + output from latest turn). */
  totalTokens?: number;
  /** Tokens remaining in the active context window. */
  remainingTokens?: number;
  /** Percentage of the context window consumed. */
  percentUsed?: number;
}
