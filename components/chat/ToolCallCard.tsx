'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, XCircle, ExternalLink } from 'lucide-react';
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
  onOpenDrawer,
}: ToolCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const hasResult = rawResult != null && (typeof rawResult !== 'object' || Object.keys(rawResult as object).length > 0);

  return (
    <div className="my-1.5 rounded-lg border border-edge-raised/40 bg-surface-raised/40 hover:border-edge-raised/70 transition-all text-xs overflow-hidden fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer hover:opacity-90 transition-opacity"
        >
          {isLoading ? (
            <Loader2 className={`w-3.5 h-3.5 ${accentText} animate-spin shrink-0`} />
          ) : isError ? (
            <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          ) : (
            <Icon className={`w-3.5 h-3.5 ${accentText} shrink-0`} />
          )}
          <span className="font-medium text-text-primary truncate">{label}</span>
          <span className={`text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded ${isError ? 'bg-red-500/10 text-red-400' : 'bg-surface-elevated text-text-muted'}`}>
            {isLoading ? 'running...' : isError ? 'failed' : badge.toLowerCase()}
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenDrawer && status === 'success' && (
            <button
              onClick={onOpenDrawer}
              className={`flex items-center gap-1 text-[11px] ${accentText} hover:underline cursor-pointer`}
            >
              <span>Open</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-text-muted hover:text-text-primary p-0.5 transition-colors cursor-pointer"
            aria-label="Toggle details"
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-3 pb-3 pt-1 border-t border-edge-raised/30 space-y-2 text-xs">
          {summary}

          <div className="mt-2 bg-surface-base/80 p-2 rounded border border-edge-raised/50 font-mono text-[10px] text-text-muted max-h-40 overflow-y-auto space-y-1.5">
            <div>
              <span className="text-text-muted font-semibold block mb-0.5">Parameters:</span>
              <pre className="text-text-secondary whitespace-pre-wrap break-all text-[10px]">
                {JSON.stringify(rawArgs, null, 2)}
              </pre>
            </div>
            {hasResult && (
              <div className="border-t border-edge-raised/40 pt-1.5">
                <span className={`${accentText} font-semibold block mb-0.5`}>Result:</span>
                <pre className="text-text-secondary whitespace-pre-wrap break-all text-[10px]">
                  {typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
