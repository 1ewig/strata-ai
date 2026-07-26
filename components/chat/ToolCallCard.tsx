'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, Code2 } from 'lucide-react';
import type { ToolCardProps } from './tools/resolver';

export default function ToolCallCard({
  label,
  badge,
  icon: Icon,
  accentText,
  status,
  summary,
  rawArgs,
  rawResult,
}: ToolCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const hasResult = rawResult != null && (typeof rawResult !== 'object' || Object.keys(rawResult as object).length > 0);

  return (
    <div className="my-1.5 rounded-xl border border-edge-raised/40 bg-surface-overlay/30 overflow-hidden text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-raised/60 hover:bg-surface-raised transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className={`w-3.5 h-3.5 ${accentText} animate-spin`} />
          ) : isError ? (
            <XCircle className={`w-3.5 h-3.5 text-red-400`} />
          ) : (
            <Icon className={`w-3.5 h-3.5 ${accentText}`} />
          )}
          <span className="font-semibold">{label}</span>
          <span className={`text-[10px] font-medium ${isError ? 'text-red-400' : accentText}`}>
            {isLoading ? 'Executing...' : isError ? 'Failed' : badge}
          </span>
        </div>
        <div className="flex items-center gap-1 text-text-muted">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-edge-raised/60 space-y-2">
          {summary}

          <div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowRaw(!showRaw); }}
              className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors font-mono cursor-pointer"
            >
              <Code2 className="w-3 h-3" />
              <span>{showRaw ? 'Hide Parameters' : 'View Parameters'}</span>
              {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showRaw && (
              <div className="mt-2 bg-surface-raised/90 p-2 rounded-lg border border-edge-raised font-mono text-[10px] text-text-muted max-h-36 overflow-y-auto space-y-1">
                <div>
                  <span className="text-text-muted">Input Args:</span>
                  <pre className="text-text-secondary whitespace-pre-wrap break-all text-[10px] mt-0.5">
                    {JSON.stringify(rawArgs, null, 2)}
                  </pre>
                </div>
                {hasResult && (
                  <div className="border-t border-edge-raised pt-1 mt-1">
                    <span className={accentText}>Output Result:</span>
                    <pre className="text-text-secondary whitespace-pre-wrap break-all text-[10px] mt-0.5">
                      {typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
