import { tool } from "ai";
import { z } from "zod";
import { WorkspaceFile } from "@/lib/schemas";
import { StringEditEngine } from "@/lib/edit-engine";
import {
  MAX_FILE_CHARS,
  MAX_FILES_PER_WORKSPACE,
  MAX_WORKSPACE_TOTAL_CHARS,
} from "@/lib/limits";
import { WorkspaceToolsContext,
  fileMetadataSchema,
  fileSummarySchema,
  findWorkspaceFile,
  isSameFilename,
} from "./types";
import { detectLanguage } from "@/lib/languages";

/**
 * Creates the listFiles tool reporting metadata for every workspace file.
 * @param context - Workspace context providing current-file access.
 * @returns An AI SDK tool for listing workspace files.
 */
export function createListFilesTool({ getCurrentFiles }: WorkspaceToolsContext) {
  return tool({
    description:
      "List all existing files in the current workspace canvas with metadata.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      count: z.number(),
      files: z.array(fileMetadataSchema),
    }),
    execute: async () => {
      const files = getCurrentFiles();
      return {
        count: files.length,
        files: files.map((f) => ({
          id: f.id,
          name: f.name,
          language: f.language || "markdown",
          charCount: f.content?.length || 0,
        })),
      };
    },
  });
}

/**
 * Creates the readFile tool for reading a file's full content or a single section.
 * @param context - Workspace context providing current-file access.
 * @returns An AI SDK tool for reading workspace files.
 */
export function createReadFileTool({ getCurrentFiles }: WorkspaceToolsContext) {
  return tool({
    description:
      "Read full content or a specific section of a workspace file by name or ID. Always call this before making targeted edits.",
    inputSchema: z.object({
      nameOrId: z
        .string()
        .describe("Filename (e.g. 'notes.md', 'todo.md') or file ID to read."),
      section: z
        .string()
        .optional()
        .describe(
          "Optional section heading to extract (e.g. 'Professional Summary'). Omit to read full file.",
        ),
    }),
    outputSchema: z.object({
      exists: z.boolean(),
      name: z.string().optional(),
      section: z.string().optional(),
      content: z.string().optional(),
      error: z.string().optional(),
    }),
    execute: async ({ nameOrId, section }) => {
      const files = getCurrentFiles();
      const file = findWorkspaceFile(files, nameOrId);

      if (!file || !file.content?.trim()) {
        return { exists: false, error: `File "${nameOrId}" not found or empty.` };
      }

      if (section) {
        const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Matches H1-H6 headings flexibly
        const regex = new RegExp(`#{1,6}\\s*${escaped}[\\s\\S]*?(?=\\n#{1,6}\\s|\\n$)`, "i");
        const match = file.content.match(regex);
        if (match) {
          return { exists: true, name: file.name, section, content: match[0].trim() };
        }
        return {
          exists: false,
          name: file.name,
          section,
          content: `Section "${section}" not found in ${file.name}.`,
        };
      }

      return { exists: true, name: file.name, content: file.content.trim() };
    },
  });
}

/**
 * Creates the writeFile tool that creates new files or fully replaces existing ones.
 * @param context - Workspace context providing current-file access and update callbacks.
 * @returns An AI SDK tool for writing workspace files.
 */
export function createWriteFileTool({ getCurrentFiles, onUpdateFile, writer }: WorkspaceToolsContext) {
  return tool({
    description:
      "Create a new file or completely replace an existing file in the workspace canvas. Prefer editFile for targeted, surgical changes.",
    inputSchema: z.object({
      name: z
        .string()
        .describe("Filename for the document (e.g. 'index.html', 'app.ts', 'styles.css', 'document.md', 'notes.txt')."),
      content: z
        .string()
        .describe("The complete content of the file."),
      language: z
        .string()
        .optional()
        .describe("Format/language type (e.g. 'html', 'javascript', 'typescript', 'css', 'json', 'python', 'sql', 'markdown', 'text')."),
    }),
    outputSchema: z.object({
      action: z.enum(["created", "replaced"]),
      file: fileSummarySchema,
    }),
    execute: async ({ name, content, language }) => {
      const existingFiles = getCurrentFiles();
      const existing = existingFiles.find((f) => isSameFilename(f.name, name));

      // Only new files count against the per-workspace file cap.
      if (!existing && existingFiles.length >= MAX_FILES_PER_WORKSPACE) {
        throw new Error(
          `File creation rejected: Maximum ${MAX_FILES_PER_WORKSPACE} files allowed per workspace. Delete an existing file before creating a new one.`
        );
      }

      // Hard cap on per-file size: silently truncate instead of rejecting.
      const safeContent = content.length > MAX_FILE_CHARS ? content.slice(0, MAX_FILE_CHARS) : content;

      const now = new Date().toISOString();
      const updatedFile: WorkspaceFile = {
        id: existing?.id || crypto.randomUUID(),
        name,
        content: safeContent,
        // Preserve an explicit language choice, else infer from the file extension.
        language: language || detectLanguage(name),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      onUpdateFile(updatedFile);
      writer?.write({
        type: "data-workspace",
        data: { event: "file-updated", file: updatedFile },
      });

      return {
        action: existing ? "replaced" : "created",
        file: {
          id: updatedFile.id,
          name: updatedFile.name,
          language: updatedFile.language,
          charCount: updatedFile.content.length,
          createdAt: updatedFile.createdAt,
          updatedAt: updatedFile.updatedAt,
        },
      };
    },
  });
}

/**
 * Creates the editFile tool that surgically replaces a verbatim text block in a file.
 * @param context - Workspace context providing current-file access and update callbacks.
 * @returns An AI SDK tool for editing workspace files.
 */
export function createEditFileTool({ getCurrentFiles, onUpdateFile, writer }: WorkspaceToolsContext) {
  return tool({
    description:
      "Surgically edit a specific block of a workspace file. Call readFile first to get the exact text, then use searchString to specify the verbatim block to replace.",
    inputSchema: z.object({
      nameOrId: z
        .string()
        .describe("Target filename (e.g. 'document.md') or file ID."),
      explanation: z
        .string()
        .describe("Brief description of changes made."),
      searchString: z
        .string()
        .describe(
          "The EXACT block of text to replace copied verbatim from the workspace file. Include 1-2 surrounding lines as context anchors.",
        ),
      replaceString: z
        .string()
        .describe("New text content to substitute in place of searchString."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      explanation: z.string().optional(),
      strategyUsed: z.string().optional(),
      message: z.string().optional(),
      error: z.string().optional(),
      file: fileSummarySchema.optional(),
    }),
    execute: async ({ nameOrId, searchString, replaceString, explanation }) => {
      const files = getCurrentFiles();
      const targetFile = findWorkspaceFile(files, nameOrId);

      if (!targetFile) {
        return {
          success: false,
          error: `File "${nameOrId}" not found in workspace. Call listFiles to see available files.`,
        };
      }

      const result = StringEditEngine.applyEdit(targetFile.content, searchString, replaceString);

      if (!result.success || !result.newContent) {
        return { success: false, error: result.error };
      }

      if (result.newContent.length > MAX_FILE_CHARS) {
        return {
          success: false,
          error: `Edit rejected: Resulting file size (${result.newContent.length.toLocaleString()} chars) exceeds maximum allowed limit of ${MAX_FILE_CHARS.toLocaleString()} characters.`,
        };
      }

      // Sum sizes of all other files so the whole workspace stays under the total cap.
      const otherFilesTotal = files.reduce((acc, f) => acc + (f.id === targetFile.id ? 0 : (f.content?.length || 0)), 0);
      if (otherFilesTotal + result.newContent.length > MAX_WORKSPACE_TOTAL_CHARS) {
        return {
          success: false,
          error: `Edit rejected: Total workspace content size (${(otherFilesTotal + result.newContent.length).toLocaleString()} chars) would exceed maximum workspace limit of ${MAX_WORKSPACE_TOTAL_CHARS.toLocaleString()} characters.`,
        };
      }

      const updatedFile: WorkspaceFile = {
        ...targetFile,
        content: result.newContent,
        updatedAt: new Date().toISOString(),
      };

      onUpdateFile(updatedFile);
      writer?.write({
        type: "data-workspace",
        data: { event: "file-updated", file: updatedFile },
      });

      return {
        success: true,
        explanation,
        strategyUsed: result.strategyUsed,
        message: `File ${targetFile.name} updated successfully.`,
        file: {
          id: updatedFile.id,
          name: updatedFile.name,
          language: updatedFile.language,
          charCount: updatedFile.content.length,
          createdAt: updatedFile.createdAt,
          updatedAt: updatedFile.updatedAt,
        },
      };
    },
  });
}

/**
 * Creates the renameFile tool that renames a file while preserving its content.
 * @param context - Workspace context providing current-file access and update callbacks.
 * @returns An AI SDK tool for renaming workspace files.
 */
export function createRenameFileTool({ getCurrentFiles, onUpdateFile, writer }: WorkspaceToolsContext) {
  return tool({
    description:
      "Rename a workspace file. Updates the filename while preserving its content.",
    inputSchema: z.object({
      nameOrId: z
        .string()
        .describe("Current filename or file ID of the file to rename."),
      newName: z
        .string()
        .describe("New filename (e.g. 'notes.md', 'todo.md'). Must not already exist in workspace."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      oldName: z.string().optional(),
      newName: z.string().optional(),
      file: fileSummarySchema.optional(),
      error: z.string().optional(),
    }),
    execute: async ({ nameOrId, newName }) => {
      const files = getCurrentFiles();
      const target = findWorkspaceFile(files, nameOrId);

      if (!target) {
        return { success: false, error: `File "${nameOrId}" not found. Call listFiles to see available files.` };
      }

      // Reject renames that collide with an existing file (case-insensitive).
      const collision = files.find(
        (f) => f.id !== target.id && isSameFilename(f.name, newName),
      );
      if (collision) {
        return { success: false, error: `A file named "${newName}" already exists.` };
      }

      const renamed: WorkspaceFile = {
        ...target,
        name: newName,
        language: detectLanguage(newName),
        updatedAt: new Date().toISOString(),
      };

      onUpdateFile(renamed);
      writer?.write({
        type: "data-workspace",
        data: { event: "file-updated", file: renamed },
      });

      return {
        success: true,
        oldName: target.name,
        newName,
        file: {
          id: renamed.id,
          name: renamed.name,
          language: renamed.language,
          charCount: renamed.content.length,
          createdAt: renamed.createdAt,
          updatedAt: renamed.updatedAt,
        },
      };
    },
  });
}

/**
 * Creates the deleteFile tool that removes a file from the workspace.
 * @param context - Workspace context providing current-file access and delete callbacks.
 * @returns An AI SDK tool for deleting workspace files.
 */
export function createDeleteFileTool({ getCurrentFiles, onDeleteFile, writer }: WorkspaceToolsContext) {
  return tool({
    description: "Delete a file from the workspace canvas.",
    inputSchema: z.object({
      nameOrId: z.string().describe("Filename or file ID to delete."),
    }),
    outputSchema: z.object({
      deleted: z.boolean(),
      fileId: z.string().optional(),
      name: z.string().optional(),
      error: z.string().optional(),
    }),
    execute: async ({ nameOrId }) => {
      const files = getCurrentFiles();
      const targetFile = findWorkspaceFile(files, nameOrId);

      if (!targetFile) {
        return { deleted: false, error: `File "${nameOrId}" not found.` };
      }

      onDeleteFile(targetFile.id);
      writer?.write({
        type: "data-workspace",
        data: { event: "file-deleted", fileId: targetFile.id, name: targetFile.name },
      });

      return {
        deleted: true,
        fileId: targetFile.id,
        name: targetFile.name,
      };
    },
  });
}
