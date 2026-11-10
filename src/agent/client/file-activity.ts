import { isToolPart, normalizeToolPart } from './tool-normalization';

/** A workspace file mutation performed by the assistant during one turn. */
export interface FileActivity {
  /** Stable workspace file id from the tool result, when available. */
  fileId: string | null;
  /** Display name of the file at the time of the operation. */
  name: string;
  /** Kind of mutation the assistant performed. */
  action: 'created' | 'replaced' | 'edited' | 'renamed' | 'deleted';
}

interface FileToolArgsLike {
  name?: unknown;
  nameOrId?: unknown;
  newName?: unknown;
}

interface FileToolResultLike {
  name?: unknown;
  oldName?: unknown;
  newName?: unknown;
  action?: unknown;
  file?: { name?: unknown; id?: unknown } | null;
}

/** Canonical (lowercase, alphanumeric-only) names of file-mutating tools. */
const FILE_TOOLS = new Set([
  'writefile',
  'writef',
  'editfile',
  'editf',
  'renamefile',
  'renamef',
  'deletefile',
  'deletef',
]);

function asString(value: unknown): string {
  return typeof value === 'string' && value ? value : '';
}

function asFileToolArgs(args: unknown): FileToolArgsLike {
  return args && typeof args === 'object' ? (args as FileToolArgsLike) : {};
}

function asFileToolResult(result: unknown): FileToolResultLike {
  const r =
    result && typeof result === 'object' ? (result as FileToolResultLike) : {};
  return {
    ...r,
    file:
      r.file && typeof r.file === 'object'
        ? (r.file as FileToolResultLike['file'])
        : null,
  };
}

/**
 * Extracts the workspace file mutations the assistant performed in one message
 * (writeFile, editFile, renameFile, deleteFile successes), in order of first
 * appearance and deduplicated by file id (name fallback) with the last action
 * winning. Pure data derivation — no UI concerns.
 */
export function collectFileActivity(message: {
  parts?: unknown[];
}): FileActivity[] {
  const parts = Array.isArray(message?.parts) ? message.parts : [];
  const byKey = new Map<string, FileActivity>();
  const order: string[] = [];

  for (const part of parts) {
    if (!isToolPart(part)) continue;
    const tool = normalizeToolPart(part);
    if (tool.status !== 'success') continue;

    const canonical = tool.name.replace(/[^a-z]/gi, '').toLowerCase();
    if (!FILE_TOOLS.has(canonical)) continue;

    const a = asFileToolArgs(tool.args);
    const r = asFileToolResult(tool.result);
    const fileId = asString(r.file?.id) || null;

    let name: string;
    let action: FileActivity['action'];
    switch (canonical) {
      case 'writefile':
      case 'writef':
        name = asString(a.name) || asString(r.file?.name) || asString(r.name);
        action = r.action === 'created' ? 'created' : 'replaced';
        break;
      case 'editfile':
      case 'editf':
        name =
          asString(a.nameOrId) || asString(r.file?.name) || asString(r.name);
        action = 'edited';
        break;
      case 'renamefile':
      case 'renamef':
        name =
          asString(r.newName) ||
          asString(a.newName) ||
          asString(r.file?.name) ||
          asString(a.nameOrId) ||
          asString(r.oldName);
        action = 'renamed';
        break;
      default:
        name =
          asString(a.nameOrId) || asString(r.name) || asString(r.file?.name);
        action = 'deleted';
        break;
    }
    if (!name) continue;

    const key = fileId || `name:${name}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.name = name;
      existing.action = action;
    } else {
      byKey.set(key, { fileId, name, action });
      order.push(key);
    }
  }

  return order.map((key) => byKey.get(key) as FileActivity);
}
