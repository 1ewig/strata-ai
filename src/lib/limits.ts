export const MAX_MESSAGE_CHARS = 2000;
export const MAX_FILE_CHARS = 10000;
export const MAX_WORKSPACE_TOTAL_CHARS = 50000;

export function formatCharCount(count: number, max: number): string {
  return `${count.toLocaleString()} / ${max.toLocaleString()}`;
}

export function isMessageOverLimit(length: number): boolean {
  return length > MAX_MESSAGE_CHARS;
}

export function isFileOverLimit(length: number): boolean {
  return length > MAX_FILE_CHARS;
}

export function isWorkspaceTotalOverLimit(totalLength: number): boolean {
  return totalLength > MAX_WORKSPACE_TOTAL_CHARS;
}
