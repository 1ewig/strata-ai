import { isToolUIPart, type UIMessage } from "ai";
import type { WorkspaceFile } from "@/lib/schemas";

/**
 * Structural subset of a UI message, decoupled from the AI SDK's exact typing.
 * @property id - Optional message identifier.
 * @property role - Optional message role (e.g. 'assistant').
 * @property content - Optional plain-text message content.
 * @property parts - Optional array of message parts, including tool parts.
 */
export interface GenericUIMessage {
  id?: string;
  role?: string;
  content?: string;
  parts?: unknown[];
}

// Union of shapes a tool result can carry that describe workspace file changes.
type FileResult = {
  file?: WorkspaceFile;
  files?: WorkspaceFile[];
  deleted?: boolean;
  fileId?: string;
  name?: string;
};

// Extracts the FileResult from a tool part, handling both the modern typed shape and legacy invocation shape.
function getToolOutput(part: unknown): FileResult | undefined {
  if (!part || typeof part !== "object") return undefined;

  // Modern typed tool part
  if (isToolUIPart(part as any)) {
    const p = part as any;
    if (p.state === "output-available" && p.output) {
      return p.output as FileResult;
    }
    return undefined;
  }

  // Legacy tool-invocation part
  const inv = (part as any).toolInvocation ?? part;
  const res = inv.result ?? inv.output;
  return res as FileResult | undefined;
}

/**
 * Extracts workspace files created or updated by tool calls in a message.
 * @param msg - The UI message whose tool parts to scan.
 * @returns De-duplicated list of files found in tool results.
 */
export function extractFilesFromMessage(msg: UIMessage | GenericUIMessage): WorkspaceFile[] {
  if (!msg?.parts?.length) return [];

  const files: WorkspaceFile[] = [];
  const seen = new Set<string>();

  for (const part of msg.parts) {
    const res = getToolOutput(part);
    if (!res) continue;

    // De-dupe by file id so repeated tool calls on the same file merge into one entry.
    if (Array.isArray(res.files)) {
      for (const f of res.files) {
        if (f?.id && !seen.has(f.id) && typeof f.content === "string") {
          seen.add(f.id);
          files.push(f);
        }
      }
    } else if (res.file && typeof res.file.content === "string") {
      if (res.file.id && !seen.has(res.file.id)) {
        seen.add(res.file.id);
        files.push(res.file);
      }
    }
  }

  return files;
}

/**
 * Extracts file deletions signalled by tool calls in a message.
 * @param msg - The UI message whose tool parts to scan.
 * @returns List of deleted-file identifiers (id and/or name) found in tool results.
 */
export function extractDeletedFilesFromMessage(
  msg: UIMessage | GenericUIMessage,
): { fileId?: string; name?: string }[] {
  if (!msg?.parts?.length) return [];

  const deletions: { fileId?: string; name?: string }[] = [];

  for (const part of msg.parts) {
    const res = getToolOutput(part);
    if (res?.deleted === true && (res.fileId || res.name)) {
      deletions.push({ fileId: res.fileId, name: res.name });
    }
  }

  return deletions;
}

/**
 * Structural slice of a message that just exposes compaction-summary metadata.
 */
type CompactionAwareMessage = { metadata?: { isCompactedSummary?: boolean } };

/**
 * Finds the index of the latest compaction summary message in a messages array.
 * @param messages - Array of messages to search.
 * @returns The index of the latest compaction summary message, or -1 if none exists.
 */
export function findLatestCompactedMessageIndex(
  messages: CompactionAwareMessage[] | undefined,
): number {
  if (!messages || messages.length === 0) return -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.metadata?.isCompactedSummary === true) {
      return i;
    }
  }
  return -1;
}

/**
 * Trims a conversation to begin at the latest compaction summary, so the model
 * never re-reads history that predates the last summary. This is the single
 * source of truth for history pruning shared by both the agent and compaction
 * endpoints (the client transport no longer mutates the outgoing payload).
 * @param messages - Array of messages to slice.
 * @returns A copy trimmed after the latest summary, or the original array when none exists.
 */
export function sliceMessagesAfterCompaction<T>(
  messages: T[] | undefined,
): T[] {
  if (!messages || messages.length === 0) return messages ?? [];
  const latestIdx = findLatestCompactedMessageIndex(
    messages as CompactionAwareMessage[],
  );
  return latestIdx >= 0 ? messages.slice(latestIdx) : messages;
}
