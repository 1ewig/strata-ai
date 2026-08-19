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
/** Maximum messages allowed in the 5-hour sliding window. */
export const QUOTA_5H_LIMIT = 10;
/** Maximum messages allowed in the 7-day sliding window. */
export const QUOTA_WEEK_LIMIT = 50;
/** Context-window occupancy percentage that flips the UI and system prompt into "near limit" warning mode. */
export const NEAR_LIMIT_PERCENT = 80;
/** Maximum number of images a single user message may attach. */
export const MAX_IMAGES_PER_MESSAGE = 4;
/** Maximum raw file size (bytes) accepted for an image attachment before compression. */
export const MAX_IMAGE_INPUT_BYTES = 5_000_000;
/** Maximum compressed size (bytes) a processed attachment may reach (base64 data URL ≈ 4/3 bytes per char). */
export const MAX_IMAGE_OUTPUT_BYTES = 1_500_000;
/** Maximum pixel dimension (width or height) kept after client-side downscaling. */
export const MAX_IMAGE_DIMENSION = 1280;
/** Server-side gate for image data URL length (chars), mirroring MAX_IMAGE_OUTPUT_BYTES on the wire. */
export const MAX_IMAGE_DATA_URL_CHARS = 2_000_000;
/** MIME types accepted for image attachments (client picker and server validation). */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

/** Type of the MIME whitelist entries in ALLOWED_IMAGE_TYPES. */
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

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
 * Canonical rate-limit rejection message used by the server-side 429 responses.
 * @param retryAfter - Optional seconds until the oldest entry expires.
 * @returns A human-readable summary of the enforced quotas and retry hint.
 */
export function buildRateLimitErrorMessage(retryAfter?: number): string {
  const retryHint = retryAfter != null ? ` Try again in ${Math.ceil(retryAfter / 60)} min.` : " Please try again later.";
  return `Max ${QUOTA_5H_LIMIT} messages per 5 hours, ${QUOTA_WEEK_LIMIT} per week.${retryHint}`;
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

