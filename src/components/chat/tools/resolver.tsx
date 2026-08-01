import React, { type ReactNode } from 'react';
import { type LucideIcon, Sparkles, Search, Trash2, PencilLine, PenLine, Wrench, FileText, ExternalLink, Folder, Globe } from 'lucide-react';
import { Resume, WorkspaceFile } from '@/lib/schemas';

export interface ToolCardProps {
  label: string;
  badge: string;
  icon: LucideIcon;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  status: 'loading' | 'success' | 'error';
  summary: ReactNode;
  rawArgs: unknown;
  rawResult: unknown;
  onOpenDrawer?: () => void;
}

type ToolConfig = {
  label: string;
  badge: string;
  icon: LucideIcon;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
};

const toolConfigs: Record<string, ToolConfig> = {
  listFiles: {
    label: 'Workspace Files Listed',
    badge: 'Listed',
    icon: Folder,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  readFile: {
    label: 'File Read',
    badge: 'Read',
    icon: Search,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  writeFile: {
    label: 'File Written',
    badge: 'Updated',
    icon: Sparkles,
    accent: 'primary',
    accentBg: 'bg-primary-soft',
    accentBorder: 'border-primary/40',
    accentText: 'text-primary',
  },
  editFile: {
    label: 'File Edited',
    badge: 'Applied',
    icon: PencilLine,
    accent: 'warning',
    accentBg: 'bg-warning-soft',
    accentBorder: 'border-secondary/70',
    accentText: 'text-warning',
  },
  renameFile: {
    label: 'File Renamed',
    badge: 'Renamed',
    icon: PenLine,
    accent: 'accent-pink-deep',
    accentBg: 'bg-accent-pink-soft',
    accentBorder: 'border-accent-pink/70',
    accentText: 'text-accent-pink-deep',
  },
  deleteFile: {
    label: 'File Deleted',
    badge: 'Deleted',
    icon: Trash2,
    accent: 'danger',
    accentBg: 'bg-danger-soft',
    accentBorder: 'border-danger/40',
    accentText: 'text-danger',
  },
  webSearch: {
    label: 'Web Search Executed',
    badge: 'Searched',
    icon: Globe,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  extractUrl: {
    label: 'Web Page Extracted',
    badge: 'Extracted',
    icon: FileText,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  // Legacy aliases
  writeResume: {
    label: 'Resume Updated',
    badge: 'Updated',
    icon: Sparkles,
    accent: 'primary',
    accentBg: 'bg-primary-soft',
    accentBorder: 'border-primary/40',
    accentText: 'text-primary',
  },
  readResume: {
    label: 'Resume Read',
    badge: 'Read',
    icon: Search,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  deleteResume: {
    label: 'Resume Deleted',
    badge: 'Cleared',
    icon: Trash2,
    accent: 'danger',
    accentBg: 'bg-danger-soft',
    accentBorder: 'border-danger/40',
    accentText: 'text-danger',
  },
  editResume: {
    label: 'Resume Edited',
    badge: 'Applied',
    icon: PencilLine,
    accent: 'warning',
    accentBg: 'bg-warning-soft',
    accentBorder: 'border-secondary/70',
    accentText: 'text-warning',
  },
};

const defaultConfig: ToolConfig = {
  label: 'Tool Executed',
  badge: 'Executed',
  icon: Wrench,
  accent: 'info',
  accentBg: 'bg-accent-blue-soft',
  accentBorder: 'border-accent-blue/60',
  accentText: 'text-info',
};

function normalizeToolName(raw: string): { normalized: string; isCustom: boolean } {
  if (!raw) return { normalized: '', isCustom: true };
  const clean = raw.trim().toLowerCase().replace(/[-_]/g, '');

  if (clean === 'listfiles' || clean === 'list') return { normalized: 'listFiles', isCustom: false };
  if (clean === 'readfile' || clean === 'readf') return { normalized: 'readFile', isCustom: false };
  if (clean === 'writefile' || clean === 'writef') return { normalized: 'writeFile', isCustom: false };
  if (clean === 'editfile' || clean === 'editf') return { normalized: 'editFile', isCustom: false };
  if (clean === 'deletefile' || clean === 'deletef') return { normalized: 'deleteFile', isCustom: false };
  if (clean === 'renamefile' || clean === 'renamef') return { normalized: 'renameFile', isCustom: false };
  if (clean === 'websearch' || clean === 'tavilysearch' || clean === 'tavily' || clean === 'search') return { normalized: 'webSearch', isCustom: false };
  if (clean === 'extracturl' || clean === 'extractpage' || clean === 'extract' || clean === 'tavilyextract') return { normalized: 'extractUrl', isCustom: false };

  if (clean === 'writeresume') return { normalized: 'writeResume', isCustom: false };
  if (clean === 'readresume') return { normalized: 'readResume', isCustom: false };
  if (clean === 'deleteresume') return { normalized: 'deleteResume', isCustom: false };
  if (clean === 'editresume') return { normalized: 'editResume', isCustom: false };

  return { normalized: raw, isCustom: true };
}

function extractToolInfo(toolCall: any) {
  if (!toolCall) return { name: '', rawName: '', args: {}, result: {}, state: 'result' as const, isCustom: true };

  const inv = toolCall.toolInvocation || toolCall.toolCall || toolCall.toolResult || toolCall;

  const rawName =
    inv?.toolName ||
    inv?.name ||
    inv?.function?.name ||
    toolCall?.toolName ||
    toolCall?.name ||
    (typeof inv?.type === 'string' && inv.type.startsWith('tool-') && inv.type !== 'tool-invocation'
      ? inv.type.replace(/^tool-/, '')
      : '') ||
    '';

  const { normalized: name, isCustom } = normalizeToolName(rawName);

  let args =
    inv?.args ||
    inv?.input ||
    inv?.parameters ||
    toolCall?.args ||
    toolCall?.input ||
    {};

  let result =
    inv?.result ||
    inv?.output ||
    inv?.response ||
    toolCall?.result ||
    toolCall?.output ||
    {};

  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch {}
  }
  if (typeof result === 'string') {
    try { result = JSON.parse(result); } catch {}
  }

  const state =
    inv?.state ||
    toolCall?.state ||
    (result && (typeof result !== 'object' || Object.keys(result).length > 0) ? 'result' : 'call');

  return { name, rawName, args, result, state: state as 'call' | 'partial-call' | 'result', isCustom };
}

function buildListFilesSummary(args: any, result: any): ReactNode {
  const count = result?.count ?? (result?.files?.length || 0);
  const filesList = result?.files || [];

  return (
    <div className="py-1 space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-text-primary">Workspace Files</span>
        <span className="text-[10px] font-mono text-text-muted">{count} file{count === 1 ? '' : 's'}</span>
      </div>
      <p className="text-[11px] text-text-muted font-mono truncate">
        {filesList.length > 0
          ? filesList.map((f: any) => f.name).join(', ')
          : 'No files in workspace'}
      </p>
    </div>
  );
}

function buildReadFileSummary(args: any, result: any): ReactNode {
  const fileName = args?.nameOrId || result?.name || 'File';
  const section = args?.section || result?.section;
  const content = result?.content || (typeof result === 'string' ? result : '');

  return (
    <div className="py-1 space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium font-mono text-text-primary truncate">{fileName}</span>
        {section && <span className="text-[10px] text-info font-mono shrink-0">section: {section}</span>}
      </div>
      <p className="text-[11px] text-text-muted truncate">
        {result?.exists === false
          ? result?.error || 'File or section not found'
          : content
          ? content.slice(0, 100).replace(/\s+/g, ' ')
          : 'File content read'}
      </p>
    </div>
  );
}

function buildWriteFileSummary(args: any, result: any): ReactNode {
  const file: WorkspaceFile | null = result?.file || null;
  const name = args?.name || file?.name || 'document.md';
  const content = args?.content || file?.content || '';
  const charCount = content.length;

  return (
    <div className="py-1 space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium font-mono text-text-primary truncate">{name}</span>
        <span className="text-[10px] text-primary/90 font-mono shrink-0">
          {charCount > 0 ? `${charCount.toLocaleString()} chars` : 'updated'}
        </span>
      </div>
    </div>
  );
}

function buildEditFileSummary(args: any, result: any): ReactNode {
  const name = args?.nameOrId || result?.file?.name || 'File';

  return (
    <div className="py-1 space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium font-mono text-text-primary truncate">{name}</span>
        {result?.strategyUsed && (
          <span className="text-[10px] text-warning/90 font-mono shrink-0">
            {result.strategyUsed} match
          </span>
        )}
      </div>
      {(args?.explanation || result?.explanation) && (
        <p className="text-[11px] text-text-muted truncate">
          {args?.explanation || result?.explanation}
        </p>
      )}
      {result?.error && (
        <p className="text-[11px] text-danger truncate">Error: {result.error}</p>
      )}
    </div>
  );
}

function buildRenameFileSummary(args: any, result: any): ReactNode {
  const oldName = args?.nameOrId || result?.oldName || 'File';
  const newName = result?.newName || args?.newName || '';
  return (
    <div className="py-1 text-xs flex items-center gap-1.5 font-mono">
      <span className="text-text-muted line-through truncate">{oldName}</span>
      <span className="text-text-secondary">→</span>
      <span className="text-text-primary font-medium truncate">{newName}</span>
    </div>
  );
}

function buildDeleteFileSummary(args: any, result: any): ReactNode {
  const name = args?.nameOrId || result?.name || 'File';
  return (
    <div className="py-1 text-xs font-mono text-text-muted">
      File <span className="text-danger font-medium">{name}</span> removed from workspace.
    </div>
  );
}

function buildWebSearchSummary(args: any, result: any): ReactNode {
  const query = args?.query || result?.query || 'Web Search';
  const resultsList = result?.results || [];
  const count = resultsList.length;
  const answer = result?.answer;

  return (
    <div className="py-1 space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium font-mono text-text-primary truncate">&quot;{query}&quot;</span>
        <span className="text-[10px] text-info font-mono shrink-0 font-medium">
          {count} result{count === 1 ? '' : 's'}
        </span>
      </div>
      {answer && (
        <p className="text-[11px] text-text-muted line-clamp-2">
          {answer}
        </p>
      )}
      {result?.error ? (
        <p className="text-[11px] text-danger truncate">Error: {result.error}</p>
      ) : resultsList.length > 0 ? (
        <p className="text-[10px] font-mono text-text-muted/80 truncate">
          Sources:{' '}
          {resultsList
            .map((r: any) => {
              try {
                return new URL(r.url).hostname.replace(/^www\./, '');
              } catch {
                return r.title || r.url;
              }
            })
            .filter(Boolean)
            .slice(0, 3)
            .join(', ')}
        </p>
      ) : null}
    </div>
  );
}

function buildExtractUrlSummary(args: any, result: any): ReactNode {
  const urls: string[] = args?.urls || [];
  const extracted = result?.extracted || [];
  const count = extracted.length;

  return (
    <div className="py-1 space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium font-mono text-text-primary truncate">
          {urls.length > 0 ? urls.join(', ') : 'URL Extraction'}
        </span>
        <span className="text-[10px] text-info font-mono shrink-0 font-medium">
          {count} page{count === 1 ? '' : 's'} extracted
        </span>
      </div>
      {result?.error ? (
        <p className="text-[11px] text-danger truncate">Error: {result.error}</p>
      ) : extracted.length > 0 ? (
        <p className="text-[11px] text-text-muted line-clamp-2 font-mono">
          {extracted[0]?.rawContent?.slice(0, 150).replace(/\s+/g, ' ')}...
        </p>
      ) : null}
    </div>
  );
}

function buildGenericSummary(args: any, rawName: string): ReactNode {
  return (
    <div className="py-1 text-xs">
      <p className="font-medium text-text-primary truncate">{rawName || 'Tool Execution'}</p>
    </div>
  );
}

export function resolveToolDisplay(toolCall: any, onOpenDrawer?: () => void): ToolCardProps {
  const { name, rawName, args, result, state, isCustom } = extractToolInfo(toolCall);

  let cfg = toolConfigs[name] || defaultConfig;
  let label = !isCustom ? cfg.label : (rawName || cfg.label);
  const status = state === 'call' || state === 'partial-call' ? 'loading' : result?.success === false ? 'error' : 'success';

  const action = (result as any)?.action;
  if ((name === 'writeFile' || name === 'writeResume') && (action === 'created' || action === 'replaced')) {
    cfg = { ...cfg, badge: action === 'created' ? 'Created' : 'Replaced' };
    label = action === 'created' ? 'File Created' : 'File Replaced';
  }

  let summary: ReactNode;
  switch (name) {
    case 'listFiles':
      summary = buildListFilesSummary(args, result);
      break;
    case 'readFile':
    case 'readResume':
      summary = buildReadFileSummary(args, result);
      break;
    case 'writeFile':
    case 'writeResume':
      summary = buildWriteFileSummary(args, result);
      break;
    case 'editFile':
    case 'editResume':
      summary = buildEditFileSummary(args, result);
      break;
    case 'renameFile':
      summary = buildRenameFileSummary(args, result);
      break;
    case 'deleteFile':
    case 'deleteResume':
      summary = buildDeleteFileSummary(args, result);
      break;
    case 'webSearch':
      summary = buildWebSearchSummary(args, result);
      break;
    case 'extractUrl':
      summary = buildExtractUrlSummary(args, result);
      break;
    default:
      summary = buildGenericSummary(args, rawName);
  }

  return {
    label,
    badge: cfg.badge,
    icon: cfg.icon,
    accent: cfg.accent,
    accentBg: cfg.accentBg,
    accentBorder: cfg.accentBorder,
    accentText: cfg.accentText,
    status,
    summary,
    rawArgs: args,
    rawResult: result,
    onOpenDrawer,
  };
}
