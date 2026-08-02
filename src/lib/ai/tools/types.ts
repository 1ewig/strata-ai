import { z } from "zod";
import { WorkspaceFile } from "@/lib/schemas";

/**
 * Closures wiring tools to the live workspace state of the current request.
 * @property getCurrentFiles - Returns the current workspace files.
 * @property onUpdateFile - Callback fired when a tool creates, edits, or renames a file.
 * @property onDeleteFile - Callback fired when a tool deletes a file.
 */
export interface WorkspaceToolsContext {
  getCurrentFiles: () => WorkspaceFile[];
  onUpdateFile: (file: WorkspaceFile) => void;
  onDeleteFile: (fileIdOrName: string) => void;
}

// Metadata-only shape for file listings (deliberately excludes content).
export const fileMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  language: z.string(),
  charCount: z.number(),
});

// Full-file shape returned by write/edit tools so the client can persist the result.
export const workspaceFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  language: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Case-insensitive comparison of two filenames.
 */
export function isSameFilename(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Finds a workspace file by ID or case-insensitive name match.
 */
export function findWorkspaceFile(
  files: WorkspaceFile[],
  nameOrId: string,
): WorkspaceFile | undefined {
  return files.find((f) => f.id === nameOrId || isSameFilename(f.name, nameOrId));
}
