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
export const CONTEXT_COMPACTION_THRESHOLD_PERCENT = 80;

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

