'use client';

import React, { useState } from 'react';
import { Sparkles, FileText, Search, Trash2, ChevronDown, ChevronUp, CheckCircle2, ExternalLink, Code2, Loader2, Wrench } from 'lucide-react';
import { Resume } from '@/lib/schemas';

interface ToolCallCardProps {
  toolCall: {
    toolName?: string;
    name?: string;
    args?: any;
    input?: any;
    result?: any;
    output?: any;
    toolInvocation?: any;
  };
  onOpenResumeDrawer?: () => void;
}

type ToolConfig = {
  label: string;
  badge: string;
  icon: typeof Sparkles;
  accent: string;
  accentBg: string;
  accentBorder: string;
  text: string;
};

const toolConfigs: Record<string, ToolConfig> = {
  writeResume: {
    label: 'Resume Updated',
    badge: 'Updated',
    icon: Sparkles,
    accent: 'emerald-500',
    accentBg: 'bg-emerald-500/20',
    accentBorder: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  readResume: {
    label: 'Resume Read',
    badge: 'Read',
    icon: Search,
    accent: 'blue-500',
    accentBg: 'bg-blue-500/20',
    accentBorder: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  deleteResume: {
    label: 'Resume Deleted',
    badge: 'Cleared',
    icon: Trash2,
    accent: 'red-500',
    accentBg: 'bg-red-500/20',
    accentBorder: 'border-red-500/30',
    text: 'text-red-400',
  },
};

const defaultConfig: ToolConfig = {
  label: 'Tool Executed',
  badge: 'Executed',
  icon: Wrench,
  accent: 'cyan-500',
  accentBg: 'bg-cyan-500/20',
  accentBorder: 'border-cyan-500/30',
  text: 'text-cyan-400',
};

function normalizeToolName(raw: string): { normalized: string; isCustom: boolean } {
  if (!raw) return { normalized: '', isCustom: true };
  const clean = raw.trim().toLowerCase().replace(/[-_]/g, '');

  if (clean === 'writeresume' || clean === 'write') return { normalized: 'writeResume', isCustom: false };
  if (clean === 'readresume' || clean === 'read') return { normalized: 'readResume', isCustom: false };
  if (clean === 'deleteresume' || clean === 'delete') return { normalized: 'deleteResume', isCustom: false };

  return { normalized: raw, isCustom: true };
}

function extractToolInfo(toolCall: any) {
  if (!toolCall) return { name: '', rawName: '', args: {}, result: {}, state: 'result', isCustom: true };

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

  // Handle case where args or result are stringified JSON
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

  return { name, rawName, args, result, state, isCustom };
}

export default function ToolCallCard({ toolCall, onOpenResumeDrawer }: ToolCallCardProps) {
  const [showRaw, setShowRaw] = useState(false);

  const { name, rawName, args, result, state, isCustom } = extractToolInfo(toolCall);
  const isLoading = state === 'call' || state === 'partial-call';

  const cfg = toolConfigs[name] || defaultConfig;
  const displayLabel = !isCustom ? cfg.label : (rawName || cfg.label);

  const Icon = cfg.icon;

  const updatedResume: Resume | null =
    result?.resume ||
    (typeof result?.markdownContent === 'string' ? result : null);

  const title =
    args?.title ||
    updatedResume?.title ||
    'Chat Resume';

  const markdown =
    args?.markdownContent ||
    updatedResume?.markdownContent ||
    '';

  const charCount = markdown.length;
  const sectionCount = (markdown.match(/^##\s+/gm) || []).length;

  const readSection = args?.section || (result?.exists !== undefined ? (result.section || 'Full Resume') : null);
  const readContent = result?.content || (typeof result === 'string' ? result : '');

  const handleOpenDrawer = () => {
    if (onOpenResumeDrawer) {
      onOpenResumeDrawer();
    } else {
      window.dispatchEvent(new CustomEvent('open-resume-drawer'));
    }
  };

  return (
    <div className={`bg-zinc-950/90 border ${cfg.accentBorder} rounded-xl p-3.5 shadow-md backdrop-blur-sm max-w-md my-1.5`}>
      {/* Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg ${cfg.accentBg} border ${cfg.accentBorder} flex items-center justify-center ${cfg.text}`}>
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
          </div>
          <span className="text-xs font-semibold text-zinc-200">{displayLabel}</span>
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-medium ${cfg.text} ${cfg.accentBg} border ${cfg.accentBorder} px-2 py-0.5 rounded-full`}>
          {isLoading ? (
            <>
              <Loader2 className={`w-3 h-3 ${cfg.text} animate-spin`} />
              <span>Executing...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className={`w-3 h-3 ${cfg.text}`} />
              <span>{cfg.badge}</span>
            </>
          )}
        </div>
      </div>

      {/* Card Content Summary */}
      {name === 'writeResume' ? (
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5 mb-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
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
            onClick={handleOpenDrawer}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg transition-all shrink-0 font-medium cursor-pointer"
          >
            <span>Open Drawer</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      ) : name === 'readResume' ? (
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5 mb-2.5 flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-200 truncate">{readSection || 'Full Resume'}</p>
            <p className="text-[10px] text-zinc-400 truncate">
              {result?.exists === false
                ? 'Section not found'
                : readContent
                ? `${readContent.slice(0, 80).replace(/\s+/g, ' ')}...`
                : 'The resume canvas is empty.'}
            </p>
          </div>
        </div>
      ) : name === 'deleteResume' ? (
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5 mb-2.5 flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-200 truncate">Canvas Cleared</p>
            <p className="text-[10px] text-zinc-400 truncate">Start fresh by asking the AI to create a new resume.</p>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5 mb-2.5 flex items-center gap-2.5 min-w-0">
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
      )}

      {/* Collapsible Technical Details */}
      <div>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors font-mono cursor-pointer"
        >
          <Code2 className="w-3 h-3" />
          <span>{showRaw ? 'Hide Parameters' : 'View Parameters'}</span>
          {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showRaw && (
          <div className="mt-2 bg-zinc-900/90 p-2 rounded-lg border border-zinc-800 font-mono text-[10px] text-zinc-400 max-h-36 overflow-y-auto space-y-1">
            <div>
              <span className="text-zinc-500">Input Args:</span>
              <pre className="text-zinc-300 whitespace-pre-wrap break-all text-[10px] mt-0.5">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
            {result && (typeof result !== 'object' || Object.keys(result).length > 0) && (
              <div className="border-t border-zinc-800 pt-1 mt-1">
                <span className={`${cfg.text}`}>Output Result:</span>
                <pre className="text-zinc-300 whitespace-pre-wrap break-all text-[10px] mt-0.5">
                  {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
