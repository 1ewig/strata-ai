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
  writer?: {
    write: (part: { type: `data-${string}`; id?: string; data: any; transient?: boolean }) => void;
  };
}

// Metadata-only shape for file listings (deliberately excludes content).
export const fileMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  language: z.string(),
  charCount: z.number(),
});

// Compact summary returned by write/edit/rename tools to keep tool output parts compact (excludes content).
export const fileSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  language: z.string().optional(),
  charCount: z.number(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Re-export shared filename and workspace file search utilities from workspace.ts
export { isSameFilename, findWorkspaceFile } from "../workspace";
