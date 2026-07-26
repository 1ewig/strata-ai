import { Resume, WorkspaceFile } from "@/lib/schemas";

export interface MessagePart {
  type: string;
  text?: string;
  toolName?: string;
  name?: string;
  args?: Record<string, unknown>;
  input?: Record<string, unknown>;
  result?: { resume?: Resume; file?: WorkspaceFile; files?: WorkspaceFile[]; deleted?: boolean; fileId?: string } | unknown;
  output?: { resume?: Resume; file?: WorkspaceFile; files?: WorkspaceFile[]; deleted?: boolean; fileId?: string } | unknown;
  state?: string;
}

export interface GenericUIMessage {
  id: string;
  role: string;
  content?: string;
  parts?: MessagePart[];
}

export function extractDeletedFilesFromMessage(msg: GenericUIMessage): { fileId?: string; name?: string }[] {
  if (!msg || !Array.isArray(msg.parts)) return [];

  const deletions: { fileId?: string; name?: string }[] = [];
  for (const part of msg.parts) {
    const inv = (part as any).toolInvocation || part;
    const res = inv.result || inv.output || part.result || part.output;

    if (res?.deleted === true && (res?.fileId || res?.name)) {
      deletions.push({ fileId: res.fileId, name: res.name });
    }
  }
  return deletions;
}

export function extractFilesFromMessage(msg: GenericUIMessage): WorkspaceFile[] | null {
  if (!msg || !Array.isArray(msg.parts)) return null;

  const files: WorkspaceFile[] = [];
  for (const part of msg.parts) {
    const inv = (part as any).toolInvocation || part;
    const res = inv.result || inv.output || part.result || part.output;

    if (res?.files && Array.isArray(res.files)) {
      files.push(...res.files);
    } else if (res?.file && typeof res.file.content === 'string') {
      files.push(res.file);
    } else if (res?.resume && typeof res.resume.markdownContent === 'string') {
      const r = res.resume;
      files.push({
        id: r.id || 'resume-file',
        name: `${r.title || 'resume'}.md`,
        content: r.markdownContent,
        language: 'markdown',
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
      });
    }
  }
  return files.length > 0 ? files : null;
}
