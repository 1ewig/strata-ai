import type { WorkspaceFile } from "@/lib/schemas";
import type { WorkspaceToolsContext } from "../tools/types";
import { isSameFilename } from "./operations";

/**
 * Creates a per-request mutable workspace bound to an initial file list.
 *
 * The returned object doubles as a `WorkspaceToolsContext`, so it can be handed
 * directly to `createWorkspaceTools`. Mutations update the in-memory array in
 * place, keeping tool reads/writes consistent for the duration of one request.
 *
 * @param initialFiles - The workspace files reconstructed from the request body.
 * @returns The `WorkspaceToolsContext` closures backed by the mutable array.
 */
export function createMutableWorkspace(
  initialFiles: WorkspaceFile[] = [],
): WorkspaceToolsContext {
  const files: WorkspaceFile[] = initialFiles;
  return {
    getCurrentFiles: () => files,
    onUpdateFile: (file: WorkspaceFile) => {
      const idx = files.findIndex(
        (f) => f.id === file.id || isSameFilename(f.name, file.name),
      );
      if (idx >= 0) {
        files[idx] = file;
      } else {
        files.push(file);
      }
    },
    onDeleteFile: (fileIdOrName: string) => {
      const target = fileIdOrName.toLowerCase();
      for (let i = files.length - 1; i >= 0; i--) {
        if (files[i].id === fileIdOrName || files[i].name.toLowerCase() === target) {
          files.splice(i, 1);
        }
      }
    },
  };
}
