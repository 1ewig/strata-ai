import { tool } from "ai";
import { z } from "zod";
import { WorkspaceFile, WorkspaceFileSchema } from "@/lib/schemas";
import { ResumeEditEngine } from "@/lib/edit-engine";

export const listFiles = tool({
  description:
    "List all existing files in the current workspace canvas with metadata.",
  inputSchema: z.object({}),
  contextSchema: z.object({
    workspaceFiles: z.array(WorkspaceFileSchema).optional(),
  }),
  execute: async (_, { context }) => {
    const files = context?.workspaceFiles || [];
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

export const readFile = tool({
  description:
    "Read the full content or a specific section of a workspace file by name or ID. Always call this before making targeted edits.",
  inputSchema: z.object({
    nameOrId: z
      .string()
      .describe("Filename (e.g. 'notes.md', 'resume.md') or file ID to read."),
    section: z
      .string()
      .optional()
      .describe(
        "Optional section heading to extract (e.g. 'Professional Summary'). Omit to read full file.",
      ),
  }),
  contextSchema: z.object({
    workspaceFiles: z.array(WorkspaceFileSchema).optional(),
  }),
  execute: async ({ nameOrId, section }, { context }) => {
    const files = context?.workspaceFiles || [];
    const file = files.find(
      (f) => f.id === nameOrId || f.name.toLowerCase() === nameOrId.toLowerCase(),
    );

    if (!file || !file.content?.trim()) {
      return { exists: false, error: `File "${nameOrId}" not found or empty.` };
    }

    if (section) {
      const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`##\\s*${escaped}[\\s\\S]*?(?=\\n##\\s|\\n$)`, "i");
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

    return { exists: true, name: file.name, content: file.content.trim(), file };
  },
});

export const writeFile = tool({
  description:
    "Create a new file or completely replace an existing file in the workspace canvas. Prefer editFile for targeted, surgical changes.",
  inputSchema: z.object({
    name: z
      .string()
      .describe("Filename for the document (e.g. 'document.md', 'notes.txt')."),
    content: z
      .string()
      .describe("The complete content of the file."),
    language: z
      .string()
      .optional()
      .default("markdown")
      .describe("Format/language type e.g. 'markdown' or 'text'."),
  }),
  contextSchema: z.object({
    workspaceFiles: z.array(WorkspaceFileSchema).optional(),
  }),
  execute: async ({ name, content, language }, { context }) => {
    const existingFiles = context?.workspaceFiles || [];
    const existing = existingFiles.find(
      (f) => f.name.toLowerCase() === name.toLowerCase(),
    );

    const now = new Date().toISOString();
    const updatedFile: WorkspaceFile = {
      id: existing?.id || `file-${Date.now()}`,
      name,
      content,
      language: language || (name.endsWith(".txt") ? "text" : "markdown"),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    return {
      action: existing ? "replaced" : "created",
      file: updatedFile,
    };
  },
});

interface WorkspaceToolsContext {
  getCurrentFiles: () => WorkspaceFile[];
  onUpdateFile: (file: WorkspaceFile) => void;
  onDeleteFile?: (fileId: string) => void;
}

export function createEditFileTool({ getCurrentFiles, onUpdateFile }: WorkspaceToolsContext) {
  return tool({
    description:
      "Surgically edit a specific block of a workspace file. Use searchString to specify verbatim text to replace.",
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
    execute: async ({ nameOrId, searchString, replaceString, explanation }) => {
      const files = getCurrentFiles();
      const targetFile = files.find(
        (f) => f.id === nameOrId || f.name.toLowerCase() === nameOrId.toLowerCase(),
      );

      if (!targetFile) {
        return {
          success: false,
          error: `File "${nameOrId}" not found in workspace. Call listFiles to see available files.`,
        };
      }

      const result = ResumeEditEngine.applyEdit(targetFile.content, searchString, replaceString);

      if (!result.success || !result.newContent) {
        return { success: false, error: result.error };
      }

      const updatedFile: WorkspaceFile = {
        ...targetFile,
        content: result.newContent,
        updatedAt: new Date().toISOString(),
      };

      onUpdateFile(updatedFile);

      return {
        success: true,
        explanation,
        strategyUsed: result.strategyUsed,
        message: `File ${targetFile.name} updated successfully.`,
        file: updatedFile,
      };
    },
  });
}

export function createDeleteFileTool({ getCurrentFiles, onDeleteFile }: WorkspaceToolsContext) {
  return tool({
    description: "Delete a file from the workspace canvas.",
    inputSchema: z.object({
      nameOrId: z.string().describe("Filename or file ID to delete."),
    }),
    execute: async ({ nameOrId }) => {
      const files = getCurrentFiles();
      const targetFile = files.find(
        (f) => f.id === nameOrId || f.name.toLowerCase() === nameOrId.toLowerCase(),
      );

      if (!targetFile) {
        return { success: false, error: `File "${nameOrId}" not found.` };
      }

      if (onDeleteFile) {
        onDeleteFile(targetFile.id);
      }

      return {
        deleted: true,
        fileId: targetFile.id,
        name: targetFile.name,
      };
    },
  });
}

// Backward compatibility legacy aliases
export const writeResume = writeFile;
export const readResume = readFile;

export function createWorkspaceTools(context?: WorkspaceToolsContext) {
  return {
    listFiles,
    readFile,
    writeFile,
    ...(context
      ? {
          editFile: createEditFileTool(context),
          deleteFile: createDeleteFileTool(context),
        }
      : {}),
    // Fallback aliases for backward compatibility
    writeResume,
    readResume,
  };
}
