import { WorkspaceToolsContext } from "./types";
import {
  createListFilesTool,
  createReadFileTool,
  createWriteFileTool,
  createEditFileTool,
  createRenameFileTool,
  createDeleteFileTool,
} from "./workspace-tools";
import { createWebSearchTool, createExtractUrlTool } from "./tavily-tools";

export * from "./types";
export * from "./workspace-tools";
export * from "./tavily-tools";

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
