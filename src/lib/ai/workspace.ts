import { WorkspaceFile } from "@/lib/schemas";
import { WorkspaceToolsContext } from "./tools/types";

/**
 * Case-insensitive comparison of two filenames.
 * @param a - The first filename.
 * @param b - The second filename.
 * @returns True when the names match ignoring case and surrounding whitespace.
 */
export function isSameFilename(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Finds a workspace file by ID or case-insensitive name match.
 * @param files - The workspace file list to search.
 * @param idOrName - The file id or (case-insensitive) filename to locate.
 * @returns The matching file, or undefined when nothing matches.
 */
export function findWorkspaceFile(
  files: WorkspaceFile[],
  idOrName: string,
): WorkspaceFile | undefined {
  return files.find((f) => f.id === idOrName || isSameFilename(f.name, idOrName));
}

/**
 * Returns a new file list with the given file upserted: replaced in place when
 * an existing entry matches by id or case-insensitive name, otherwise appended.
 * @param files - The current workspace file list.
 * @param file - The file to create or replace.
 * @returns A new workspace file list with the upsert applied.
 */
export function upsertFileIntoWorkspace(
  files: WorkspaceFile[],
  file: WorkspaceFile,
): WorkspaceFile[] {
  const idx = files.findIndex(
    (f) => f.id === file.id || isSameFilename(f.name, file.name),
  );
  if (idx >= 0) {
    const next = [...files];
    next[idx] = file;
    return next;
  }
  return [...files, file];
}

/**
 * Returns a new file list with every entry matching an id or case-insensitive
 * name removed.
 * @param files - The current workspace file list.
 * @param idOrName - The file id or (case-insensitive) filename to remove.
 * @returns A new workspace file list without the matching entries.
 */
export function removeFileFromWorkspace(
  files: WorkspaceFile[],
  idOrName: string,
): WorkspaceFile[] {
  return files.filter((f) => !(f.id === idOrName || isSameFilename(f.name, idOrName)));
}

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
