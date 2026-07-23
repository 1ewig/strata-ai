import React, { type ReactNode } from 'react';
import { type LucideIcon, Sparkles, Search, Trash2, PencilLine, Wrench, FileText, ExternalLink } from 'lucide-react';
import { Resume } from '@/lib/schemas';

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
  writeResume: {
    label: 'Resume Updated',
    badge: 'Updated',
    icon: Sparkles,
    accent: 'emerald-500',
    accentBg: 'bg-emerald-500/20',
    accentBorder: 'border-emerald-500/30',
    accentText: 'text-emerald-400',
  },
  readResume: {
    label: 'Resume Read',
    badge: 'Read',
    icon: Search,
    accent: 'blue-500',
    accentBg: 'bg-blue-500/20',
    accentBorder: 'border-blue-500/30',
    accentText: 'text-blue-400',
  },
  deleteResume: {
    label: 'Resume Deleted',
    badge: 'Cleared',
    icon: Trash2,
    accent: 'red-500',
    accentBg: 'bg-red-500/20',
    accentBorder: 'border-red-500/30',
    accentText: 'text-red-400',
  },
  editResume: {
    label: 'Resume Edited',
    badge: 'Applied',
    icon: PencilLine,
    accent: 'amber-500',
    accentBg: 'bg-amber-500/20',
    accentBorder: 'border-amber-500/30',
    accentText: 'text-amber-400',
  },
};

const defaultConfig: ToolConfig = {
  label: 'Tool Executed',
  badge: 'Executed',
  icon: Wrench,
  accent: 'cyan-500',
  accentBg: 'bg-cyan-500/20',
  accentBorder: 'border-cyan-500/30',
  accentText: 'text-cyan-400',
};

function normalizeToolName(raw: string): { normalized: string; isCustom: boolean } {
  if (!raw) return { normalized: '', isCustom: true };
  const clean = raw.trim().toLowerCase().replace(/[-_]/g, '');

  if (clean === 'writeresume' || clean === 'write') return { normalized: 'writeResume', isCustom: false };
  if (clean === 'readresume' || clean === 'read') return { normalized: 'readResume', isCustom: false };
  if (clean === 'deleteresume' || clean === 'delete') return { normalized: 'deleteResume', isCustom: false };
  if (clean === 'editresume' || clean === 'edit') return { normalized: 'editResume', isCustom: false };

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

function buildWriteResumeSummary(args: any, result: any, onOpenDrawer?: () => void): ReactNode {
  const updatedResume: Resume | null =
    result?.resume || (typeof result?.markdownContent === 'string' ? result : null);
  const title = args?.title || updatedResume?.title || 'Chat Resume';
  const markdown = args?.markdownContent || updatedResume?.markdownContent || '';
  const charCount = markdown.length;
  const sectionCount = (markdown.match(/^##\s+/gm) || []).length;

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-200 truncate">{title}</p>
          <p className="text-[10px] text-zinc-400 truncate">
            {charCount > 0 ? `${charCount.toLocaleString()} chars • ${sectionCount} Sections` : 'Markdown Updated'}
          </p>
        </div>
      </div>
      <button
        onClick={onOpenDrawer}
        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg transition-all shrink-0 font-medium cursor-pointer"
      >
        <span>Open Drawer</span>
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}

function buildReadResumeSummary(args: any, result: any, onOpenDrawer?: () => void): ReactNode {
  const section = args?.section || (result?.exists !== undefined ? (result.section || 'Full Resume') : null);
  const content = result?.content || (typeof result === 'string' ? result : '');

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
          <Search className="w-4 h-4 text-blue-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-200 truncate">{section || 'Full Resume'}</p>
          <p className="text-[10px] text-zinc-400 truncate">
            {result?.exists === false
              ? 'Section not found'
              : content
              ? `${content.slice(0, 80).replace(/\s+/g, ' ')}...`
              : 'The resume canvas is empty.'}
          </p>
        </div>
      </div>
      <button
        onClick={onOpenDrawer}
        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-2.5 py-1.5 rounded-lg transition-all shrink-0 font-medium cursor-pointer"
      >
        <span>Open Drawer</span>
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}

function buildDeleteResumeSummary(): ReactNode {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5 flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
        <Trash2 className="w-4 h-4 text-red-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-zinc-200 truncate">Canvas Cleared</p>
        <p className="text-[10px] text-zinc-400 truncate">Start fresh by asking the AI to create a new resume.</p>
      </div>
    </div>
  );
}

function buildEditResumeSummary(args: any, result: any, onOpenDrawer?: () => void): ReactNode {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
          <PencilLine className="w-4 h-4 text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-200 truncate">
            {args?.explanation || result?.explanation || 'Surgical Edit'}
          </p>
          <p className="text-[10px] text-zinc-400 truncate">
            {result?.error
              ? `Error: ${result.error}`
              : result?.strategyUsed
              ? `${result.strategyUsed} match • ${args?.replaceString?.length || 0} chars modified`
              : args?.replaceString
              ? `Replacing: "${args.replaceString.slice(0, 60).replace(/\s+/g, ' ')}..."`
              : 'Targeted resume section updated'}
          </p>
        </div>
      </div>
      <button
        onClick={onOpenDrawer}
        className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1.5 rounded-lg transition-all shrink-0 font-medium cursor-pointer"
      >
        <span>Open Drawer</span>
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}

function buildGenericSummary(args: any, rawName: string): ReactNode {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5 flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
        <Wrench className="w-4 h-4 text-cyan-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-zinc-200 truncate">{rawName || 'Tool Execution'}</p>
        {Object.keys(args).length > 0 && (
          <p className="text-[10px] text-zinc-400 truncate font-mono">
            Input: {JSON.stringify(args).slice(0, 80)}
          </p>
        )}
      </div>
    </div>
  );
}

export function resolveToolDisplay(toolCall: any, onOpenDrawer?: () => void): ToolCardProps {
  const { name, rawName, args, result, state, isCustom } = extractToolInfo(toolCall);

  const cfg = toolConfigs[name] || defaultConfig;
  const label = !isCustom ? cfg.label : (rawName || cfg.label);
  const status = state === 'call' || state === 'partial-call' ? 'loading' : result?.success === false ? 'error' : 'success';

  let summary: ReactNode;
  switch (name) {
    case 'writeResume':
      summary = buildWriteResumeSummary(args, result, onOpenDrawer);
      break;
    case 'readResume':
      summary = buildReadResumeSummary(args, result, onOpenDrawer);
      break;
    case 'deleteResume':
      summary = buildDeleteResumeSummary();
      break;
    case 'editResume':
      summary = buildEditResumeSummary(args, result, onOpenDrawer);
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
