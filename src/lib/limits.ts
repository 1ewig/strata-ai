/** Maximum characters allowed in a single chat message. */
export const MAX_MESSAGE_CHARS = 2000;
/** Maximum characters allowed in a single workspace file. */
export const MAX_FILE_CHARS = 10000;
/** Maximum combined characters allowed across all workspace files. */
export const MAX_WORKSPACE_TOTAL_CHARS = 50000;
/** Maximum number of conversations a single user may keep. */
export const MAX_CONVERSATIONS_PER_USER = 5;
/** Maximum number of files allowed per workspace. */
export const MAX_FILES_PER_WORKSPACE = 3;
/** Context window occupancy percentage that triggers automatic background context compaction. */
export const CONTEXT_COMPACTION_THRESHOLD_PERCENT = 10;

/** Maximum messages allowed in the 5-hour sliding window. */
export const QUOTA_5H_LIMIT = 10;
/** Maximum messages allowed in the 7-day sliding window. */
export const QUOTA_WEEK_LIMIT = 50;

/**
 * Builds a quota error message and retry hint when a window is exhausted.
 * @param remaining5h - Remaining messages in the 5-hour window.
 * @param remainingWeek - Remaining messages in the 7-day window.
 * @param retryAfter - Optional seconds until the oldest entry expires.
 * @returns A quota error object, or null if neither window is exhausted.
 */
export function buildQuotaError(
  remaining5h: number,
  remainingWeek: number,
  retryAfter?: number,
): { message: string; retryAfter?: number } | null {
  if (remaining5h > 0 && remainingWeek > 0) return null;
  return {
    message: remaining5h <= 0
      ? `Your 5-hour quota is exhausted (${QUOTA_5H_LIMIT}/${QUOTA_5H_LIMIT} messages used).`
      : `Your weekly quota is exhausted (${QUOTA_WEEK_LIMIT}/${QUOTA_WEEK_LIMIT} messages used).`,
    retryAfter,
  };
}

/**
 * Formats a character count against its limit.
 * @param count - The current character count.
 * @param max - The allowed maximum.
 * @returns A string like "1,200 / 2,000" with locale separators.
 */
export function formatCharCount(count: number, max: number): string {
  return `${count.toLocaleString()} / ${max.toLocaleString()}`;
}

/**
 * Checks whether a message length exceeds the per-message limit.
 * @param length - The message length in characters.
 * @returns True if the message is over the limit.
 */
export function isMessageOverLimit(length: number): boolean {
  return length > MAX_MESSAGE_CHARS;
}

/**
 * Checks whether a file length exceeds the per-file limit.
 * @param length - The file content length in characters.
 * @returns True if the file is over the limit.
 */
export function isFileOverLimit(length: number): boolean {
  return length > MAX_FILE_CHARS;
}

/**
 * Checks whether a workspace's combined content length exceeds the total limit.
 * @param totalLength - The sum of all file lengths in characters.
 * @returns True if the workspace total is over the limit.
 */
export function isWorkspaceTotalOverLimit(totalLength: number): boolean {
  return totalLength > MAX_WORKSPACE_TOTAL_CHARS;
}

/**
 * Checks whether an active context occupancy percentage has crossed the compaction threshold.
 * @param percentUsed - The context occupancy percentage (0 - 100).
 * @returns True if percentUsed is at or above the threshold.
 */
export function isContextCompactionRequired(percentUsed: number): boolean {
  return percentUsed >= CONTEXT_COMPACTION_THRESHOLD_PERCENT;
}

