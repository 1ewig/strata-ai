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
  resume?: {
    id?: string;
    title?: string;
    markdownContent: string;
    createdAt?: string;
    updatedAt?: string;
  };
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

// Converts a legacy resume tool result into a workspace file for downstream merging.
function resumeToFile(resume: NonNullable<FileResult["resume"]>): WorkspaceFile {
  return {
    id: resume.id || "resume-file",
    name: `${resume.title || "resume"}.md`,
    content: resume.markdownContent,
    language: "markdown",
    createdAt: resume.createdAt || new Date().toISOString(),
    updatedAt: resume.updatedAt || new Date().toISOString(),
  };
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
    } else if (res.resume?.markdownContent) {
      const f = resumeToFile(res.resume);
      if (!seen.has(f.id)) {
        seen.add(f.id);
        files.push(f);
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
