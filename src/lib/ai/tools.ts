import { tool } from "ai";
import { z } from "zod";
import { WorkspaceFile } from "@/lib/schemas";
import { ResumeEditEngine } from "@/lib/edit-engine";
import { MAX_FILE_CHARS, MAX_FILES_PER_WORKSPACE, MAX_WORKSPACE_TOTAL_CHARS } from "@/lib/limits";

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
const fileMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  language: z.string(),
  charCount: z.number(),
});

// Full-file shape returned by write/edit tools so the client can persist the result.
const workspaceFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  language: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

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
        .describe("Filename (e.g. 'notes.md', 'resume.md') or file ID to read."),
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
      const file = files.find(
        (f) => f.id === nameOrId || f.name.toLowerCase() === nameOrId.toLowerCase(),
      );

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
export function createWriteFileTool({ getCurrentFiles, onUpdateFile }: WorkspaceToolsContext) {
  return tool({
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
    outputSchema: z.object({
      action: z.enum(["created", "replaced"]),
      file: workspaceFileSchema,
    }),
    execute: async ({ name, content, language }) => {
      const existingFiles = getCurrentFiles();
      const existing = existingFiles.find(
        (f) => f.name.toLowerCase() === name.toLowerCase(),
      );

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
        language: language || (name.endsWith(".txt") ? "text" : "markdown"),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      onUpdateFile(updatedFile);

      return {
        action: existing ? "replaced" : "created",
        file: updatedFile,
      };
    },
  });
}

/**
 * Creates the editFile tool that surgically replaces a verbatim text block in a file.
 * @param context - Workspace context providing current-file access and update callbacks.
 * @returns An AI SDK tool for editing workspace files.
 */
export function createEditFileTool({ getCurrentFiles, onUpdateFile }: WorkspaceToolsContext) {
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
      file: workspaceFileSchema.optional(),
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

/**
 * Creates the renameFile tool that renames a file while preserving its content.
 * @param context - Workspace context providing current-file access and update callbacks.
 * @returns An AI SDK tool for renaming workspace files.
 */
export function createRenameFileTool({ getCurrentFiles, onUpdateFile }: WorkspaceToolsContext) {
  return tool({
    description:
      "Rename a workspace file. Updates the filename while preserving its content.",
    inputSchema: z.object({
      nameOrId: z
        .string()
        .describe("Current filename or file ID of the file to rename."),
      newName: z
        .string()
        .describe("New filename (e.g. 'notes.md', 'resume.md'). Must not already exist in workspace."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      oldName: z.string().optional(),
      newName: z.string().optional(),
      file: workspaceFileSchema.optional(),
      error: z.string().optional(),
    }),
    execute: async ({ nameOrId, newName }) => {
      const files = getCurrentFiles();
      const target = files.find(
        (f) => f.id === nameOrId || f.name.toLowerCase() === nameOrId.toLowerCase(),
      );

      if (!target) {
        return { success: false, error: `File "${nameOrId}" not found. Call listFiles to see available files.` };
      }

      // Reject renames that collide with an existing file (case-insensitive).
      const collision = files.find(
        (f) => f.id !== target.id && f.name.toLowerCase() === newName.toLowerCase(),
      );
      if (collision) {
        return { success: false, error: `A file named "${newName}" already exists.` };
      }

      const renamed: WorkspaceFile = {
        ...target,
        name: newName,
        updatedAt: new Date().toISOString(),
      };

      onUpdateFile(renamed);

      return {
        success: true,
        oldName: target.name,
        newName,
        file: renamed,
      };
    },
  });
}

/**
 * Creates the deleteFile tool that removes a file from the workspace.
 * @param context - Workspace context providing current-file access and delete callbacks.
 * @returns An AI SDK tool for deleting workspace files.
 */
export function createDeleteFileTool({ getCurrentFiles, onDeleteFile }: WorkspaceToolsContext) {
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
      const targetFile = files.find(
        (f) => f.id === nameOrId || f.name.toLowerCase() === nameOrId.toLowerCase(),
      );

      if (!targetFile) {
        return { deleted: false, error: `File "${nameOrId}" not found.` };
      }

      onDeleteFile(targetFile.id);

      return {
        deleted: true,
        fileId: targetFile.id,
        name: targetFile.name,
      };
    },
  });
}

/**
 * Creates the webSearch tool that queries the Tavily API for real-time information.
 * @returns An AI SDK tool for web search, or a failure result if TAVILY_API_KEY is unset.
 */
export function createWebSearchTool() {
  return tool({
    description:
      "Search the web using Tavily for real-time information, current facts, latest news, documentation, or online references.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query string (e.g., 'Next.js 16 features', 'latest tech news')."),
      searchDepth: z
        .enum(["basic", "advanced"])
        .optional()
        .default("advanced")
        .describe("Search depth: 'basic' for quick results, 'advanced' for deeper analysis."),
      topic: z
        .enum(["general", "news"])
        .optional()
        .default("general")
        .describe("Topic focus: 'general' or 'news'."),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of search results to return (1-10)."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      query: z.string(),
      answer: z.string().optional(),
      results: z
        .array(
          z.object({
            title: z.string(),
            url: z.string(),
            content: z.string(),
            score: z.number().optional(),
            publishedDate: z.string().optional(),
          }),
        )
        .optional(),
      error: z.string().optional(),
    }),
    execute: async ({ query, searchDepth, topic, maxResults }) => {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          query,
          error:
            "Tavily API key is not configured. Set TAVILY_API_KEY in environment variables.",
        };
      }

      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: searchDepth || "advanced",
            topic: topic || "general",
            // Clamp the requested result count to Tavily's 1-10 supported range.
            max_results: Math.min(Math.max(maxResults || 5, 1), 10),
            include_answer: true,
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => response.statusText);
          return {
            success: false,
            query,
            error: `Tavily API error (${response.status}): ${errText}`,
          };
        }

        const data = await response.json();
        const results = Array.isArray(data.results)
          ? data.results.map((r: any) => ({
              title: String(r.title || ""),
              url: String(r.url || ""),
              content: String(r.content || ""),
              score: typeof r.score === "number" ? r.score : undefined,
              publishedDate: r.published_date ? String(r.published_date) : undefined,
            }))
          : [];

        return {
          success: true,
          query,
          answer: data.answer ? String(data.answer) : undefined,
          results,
        };
      } catch (err: any) {
        return {
          success: false,
          query,
          error: `Network error performing web search: ${err?.message || String(err)}`,
        };
      }
    },
  });
}

/**
 * Creates the extractUrl tool that pulls clean Markdown content from web pages via Tavily.
 * @returns An AI SDK tool for URL content extraction, or a failure result if TAVILY_API_KEY is unset.
 */
export function createExtractUrlTool() {
  return tool({
    description:
      "Extract full, clean Markdown content from specific web page URLs using Tavily Extract API. Call this tool when webSearch snippet results are too brief or thin.",
    inputSchema: z.object({
      urls: z
        .array(z.string())
        .min(1)
        .max(5)
        .describe("List of target web page URLs to extract full content from."),
      extractDepth: z
        .enum(["basic", "advanced"])
        .optional()
        .default("basic")
        .describe("Extraction depth: 'basic' for fast extraction, 'advanced' for JavaScript-rendered sites."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      extracted: z.array(
        z.object({
          url: z.string(),
          rawContent: z.string(),
        }),
      ),
      failed: z
        .array(
          z.object({
            url: z.string(),
            error: z.string(),
          }),
        )
        .optional(),
      error: z.string().optional(),
    }),
    execute: async ({ urls, extractDepth }) => {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          extracted: [],
          error:
            "Tavily API key is not configured. Set TAVILY_API_KEY in environment variables.",
        };
      }

      try {
        const response = await fetch("https://api.tavily.com/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: apiKey,
            urls,
            extract_depth: extractDepth || "basic",
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => response.statusText);
          return {
            success: false,
            extracted: [],
            error: `Tavily Extract API error (${response.status}): ${errText}`,
          };
        }

        const data = await response.json();
        // Cap each page's raw content to keep tool results within context limits.
        const extracted = Array.isArray(data.results)
          ? data.results.map((r: any) => ({
              url: String(r.url || ""),
              rawContent: String(r.raw_content || r.content || "").slice(0, 10000),
            }))
          : [];

        const failed = Array.isArray(data.failed_results)
          ? data.failed_results.map((f: any) => ({
              url: String(f.url || ""),
              error: String(f.error || "Failed to extract content"),
            }))
          : [];

        return {
          success: true,
          extracted,
          failed: failed.length > 0 ? failed : undefined,
        };
      } catch (err: any) {
        return {
          success: false,
          extracted: [],
          error: `Network error extracting web page content: ${err?.message || String(err)}`,
        };
      }
    },
  });
}

/**
 * Builds the full set of AI SDK tools exposed to the agent, bound to a workspace context.
 * @param context - Workspace closures shared by all workspace tools.
 * @returns A record of tool name to AI SDK tool instance.
 */
export function createWorkspaceTools(context: WorkspaceToolsContext) {
  return {
    listFiles: createListFilesTool(context),
    readFile: createReadFileTool(context),
    writeFile: createWriteFileTool(context),
    editFile: createEditFileTool(context),
    renameFile: createRenameFileTool(context),
    deleteFile: createDeleteFileTool(context),
    webSearch: createWebSearchTool(),
    extractUrl: createExtractUrlTool(),
  };
}


