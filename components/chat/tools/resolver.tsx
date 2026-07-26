import React, { type ReactNode } from 'react';
import { type LucideIcon, Sparkles, Search, Trash2, PencilLine, Wrench, FileText, ExternalLink, Folder } from 'lucide-react';
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
    accent: 'blue-400',
    accentBg: 'bg-blue-400/12',
    accentBorder: 'border-blue-400/20',
    accentText: 'text-blue-400',
  },
  readFile: {
    label: 'File Read',
    badge: 'Read',
    icon: Search,
    accent: 'blue-400',
    accentBg: 'bg-blue-400/12',
    accentBorder: 'border-blue-400/20',
    accentText: 'text-blue-400',
  },
  writeFile: {
    label: 'File Written',
    badge: 'Updated',
    icon: Sparkles,
    accent: 'emerald-400',
    accentBg: 'bg-emerald-400/12',
    accentBorder: 'border-emerald-400/20',
    accentText: 'text-emerald-400',
  },
  editFile: {
    label: 'File Edited',
    badge: 'Applied',
    icon: PencilLine,
    accent: 'amber-400',
    accentBg: 'bg-amber-400/12',
    accentBorder: 'border-amber-400/20',
    accentText: 'text-amber-400',
  },
  deleteFile: {
    label: 'File Deleted',
    badge: 'Deleted',
    icon: Trash2,
    accent: 'red-400',
    accentBg: 'bg-red-400/12',
    accentBorder: 'border-red-400/20',
    accentText: 'text-red-400',
  },
  // Legacy aliases
  writeResume: {
    label: 'Resume Updated',
    badge: 'Updated',
    icon: Sparkles,
    accent: 'emerald-400',
    accentBg: 'bg-emerald-400/12',
    accentBorder: 'border-emerald-400/20',
    accentText: 'text-emerald-400',
  },
  readResume: {
    label: 'Resume Read',
    badge: 'Read',
    icon: Search,
    accent: 'blue-400',
    accentBg: 'bg-blue-400/12',
    accentBorder: 'border-blue-400/20',
    accentText: 'text-blue-400',
  },
  deleteResume: {
    label: 'Resume Deleted',
    badge: 'Cleared',
    icon: Trash2,
    accent: 'red-400',
    accentBg: 'bg-red-400/12',
    accentBorder: 'border-red-400/20',
    accentText: 'text-red-400',
  },
  editResume: {
    label: 'Resume Edited',
    badge: 'Applied',
    icon: PencilLine,
    accent: 'amber-400',
    accentBg: 'bg-amber-400/12',
    accentBorder: 'border-amber-400/20',
    accentText: 'text-amber-400',
  },
};

const defaultConfig: ToolConfig = {
  label: 'Tool Executed',
  badge: 'Executed',
  icon: Wrench,
  accent: 'cyan-400',
  accentBg: 'bg-cyan-400/12',
  accentBorder: 'border-cyan-400/20',
  accentText: 'text-cyan-400',
};

function normalizeToolName(raw: string): { normalized: string; isCustom: boolean } {
  if (!raw) return { normalized: '', isCustom: true };
  const clean = raw.trim().toLowerCase().replace(/[-_]/g, '');

  if (clean === 'listfiles' || clean === 'list') return { normalized: 'listFiles', isCustom: false };
  if (clean === 'readfile' || clean === 'readf') return { normalized: 'readFile', isCustom: false };
  if (clean === 'writefile' || clean === 'writef') return { normalized: 'writeFile', isCustom: false };
  if (clean === 'editfile' || clean === 'editf') return { normalized: 'editFile', isCustom: false };
  if (clean === 'deletefile' || clean === 'deletef') return { normalized: 'deleteFile', isCustom: false };

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
    <div className="bg-surface-overlay border border-edge-raised/80 rounded-lg p-2.5 flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-md bg-surface-elevated flex items-center justify-center shrink-0">
        <Folder className="w-4 h-4 text-blue-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-text-primary truncate">Workspace Files ({count})</p>
        <p className="text-[10px] text-text-muted truncate">
          {filesList.length > 0
            ? filesList.map((f: any) => f.name).join(', ')
            : 'No files currently in workspace'}
        </p>
      </div>
    </div>
  );
}

function buildReadFileSummary(args: any, result: any, onOpenDrawer?: () => void): ReactNode {
  const fileName = args?.nameOrId || result?.name || 'File';
  const section = args?.section || result?.section;
  const content = result?.content || (typeof result === 'string' ? result : '');

  return (
    <div className="bg-surface-overlay border border-edge-raised/80 rounded-lg p-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-md bg-surface-elevated flex items-center justify-center shrink-0">
          <Search className="w-4 h-4 text-blue-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-primary truncate">
            {fileName} {section ? `(${section})` : ''}
          </p>
          <p className="text-[10px] text-text-muted truncate">
            {result?.exists === false
              ? result?.error || 'File or section not found'
              : content
              ? `${content.slice(0, 80).replace(/\s+/g, ' ')}...`
              : 'File is empty'}
          </p>
        </div>
      </div>
      <button
        onClick={onOpenDrawer}
        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 px-2.5 py-1.5 rounded-lg transition-all shrink-0 font-medium cursor-pointer"
      >
        <span>Open Drawer</span>
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}

function buildWriteFileSummary(args: any, result: any, onOpenDrawer?: () => void): ReactNode {
  const file: WorkspaceFile | null = result?.file || null;
  const name = args?.name || file?.name || 'document.md';
  const content = args?.content || file?.content || '';
  const charCount = content.length;

  return (
    <div className="bg-surface-overlay border border-edge-raised/80 rounded-lg p-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-md bg-surface-elevated flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-primary truncate">{name}</p>
          <p className="text-[10px] text-text-muted truncate">
            {charCount > 0 ? `${charCount.toLocaleString()} chars` : 'File updated'}
          </p>
        </div>
      </div>
      <button
        onClick={onOpenDrawer}
        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg transition-all shrink-0 font-medium cursor-pointer"
      >
        <span>Open File</span>
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}

function buildEditFileSummary(args: any, result: any, onOpenDrawer?: () => void): ReactNode {
  const name = args?.nameOrId || result?.file?.name || 'File';

  return (
    <div className="bg-surface-overlay border border-edge-raised/80 rounded-lg p-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-md bg-surface-elevated flex items-center justify-center shrink-0">
          <PencilLine className="w-4 h-4 text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-primary truncate">
            {name} — {args?.explanation || result?.explanation || 'Edited'}
          </p>
          <p className="text-[10px] text-text-muted truncate">
            {result?.error
              ? `Error: ${result.error}`
              : result?.strategyUsed
              ? `${result.strategyUsed} match • ${args?.replaceString?.length || 0} chars modified`
              : 'Targeted section updated'}
          </p>
        </div>
      </div>
      <button
        onClick={onOpenDrawer}
        className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 px-2.5 py-1.5 rounded-lg transition-all shrink-0 font-medium cursor-pointer"
      >
        <span>Open File</span>
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}

function buildDeleteFileSummary(args: any, result: any): ReactNode {
  const name = args?.nameOrId || result?.name || 'File';
  return (
    <div className="bg-surface-overlay border border-edge-raised/80 rounded-lg p-2.5 flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-md bg-surface-elevated flex items-center justify-center shrink-0">
        <Trash2 className="w-4 h-4 text-red-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-primary truncate">{name} Deleted</p>
        <p className="text-[10px] text-text-muted truncate">File removed from workspace canvas.</p>
      </div>
    </div>
  );
}

function buildGenericSummary(args: any, rawName: string): ReactNode {
  return (
    <div className="bg-surface-overlay border border-edge-raised/80 rounded-lg p-2.5 flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-md bg-surface-elevated flex items-center justify-center shrink-0">
        <Wrench className="w-4 h-4 text-cyan-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-primary truncate">{rawName || 'Tool Execution'}</p>
        {Object.keys(args).length > 0 && (
          <p className="text-[10px] text-text-muted truncate font-mono">
            Input: {JSON.stringify(args).slice(0, 80)}
          </p>
        )}
      </div>
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
      summary = buildReadFileSummary(args, result, onOpenDrawer);
      break;
    case 'writeFile':
    case 'writeResume':
      summary = buildWriteFileSummary(args, result, onOpenDrawer);
      break;
    case 'editFile':
    case 'editResume':
      summary = buildEditFileSummary(args, result, onOpenDrawer);
      break;
    case 'deleteFile':
    case 'deleteResume':
      summary = buildDeleteFileSummary(args, result);
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
