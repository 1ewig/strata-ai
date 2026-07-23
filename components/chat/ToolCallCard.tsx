'use client';

import React, { useState } from 'react';
import { Sparkles, FileText, ChevronDown, ChevronUp, CheckCircle2, ExternalLink, Code2 } from 'lucide-react';
import { Resume } from '@/lib/schemas';

interface ToolCallCardProps {
  toolCall: {
    toolName?: string;
    name?: string;
    args?: any;
    input?: any;
    result?: any;
    output?: any;
  };
  onOpenResumeDrawer?: () => void;
}

export default function ToolCallCard({ toolCall, onOpenResumeDrawer }: ToolCallCardProps) {
  const [showRaw, setShowRaw] = useState(false);

  const name = toolCall.toolName || toolCall.name || 'setResumeMarkdown';
  const args = toolCall.args || toolCall.input || {};
  const result = toolCall.result || toolCall.output || {};

  // Extract resume data
  const updatedResume: Resume | null =
    result?.resume ||
    (typeof result?.markdownContent === 'string' ? result : null);

  const title =
    args.title ||
    updatedResume?.title ||
    'Chat Resume';

  const markdown =
    args.markdownContent ||
    updatedResume?.markdownContent ||
    '';

  const charCount = markdown.length;
  const sectionCount = (markdown.match(/^##\s+/gm) || []).length;

  const handleOpenDrawer = () => {
    if (onOpenResumeDrawer) {
      onOpenResumeDrawer();
    } else {
      // Fallback custom event trigger
      window.dispatchEvent(new CustomEvent('open-resume-drawer'));
    }
  };

  return (
    <div className="bg-zinc-950/90 border border-emerald-500/30 rounded-xl p-3.5 shadow-md backdrop-blur-sm transition-all hover:border-emerald-500/50 max-w-md my-1.5">
      {/* Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-zinc-200">
            {name === 'setResumeMarkdown' ? 'Resume Workspace Updated' : name}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Executed</span>
        </div>
      </div>

      {/* Card Content Summary */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5 mb-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-200 truncate">{title}</p>
            <p className="text-[10px] text-zinc-400">
              {charCount > 0 ? `${charCount.toLocaleString()} chars • ${sectionCount} Sections` : 'Markdown Updated'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleOpenDrawer}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg transition-all shrink-0 font-medium cursor-pointer"
        >
          <span>Open Drawer</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

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
            {result && (
              <div className="border-t border-zinc-800 pt-1 mt-1">
                <span className="text-emerald-500">Output Result:</span>
                <pre className="text-zinc-300 whitespace-pre-wrap break-all text-[10px] mt-0.5">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

