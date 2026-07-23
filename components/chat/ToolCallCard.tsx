'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Code2, Loader2, XCircle } from 'lucide-react';
import type { ToolCardProps } from './tools/resolver';

export default function ToolCallCard({
  label,
  badge,
  icon: Icon,
  accent,
  accentBg,
  accentBorder,
  accentText,
  status,
  summary,
  rawArgs,
  rawResult,
}: ToolCardProps) {
  const [showRaw, setShowRaw] = useState(false);
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const hasResult = rawResult != null && (typeof rawResult !== 'object' || Object.keys(rawResult as object).length > 0);

  return (
    <div className={`bg-zinc-950/90 border ${accentBorder} rounded-xl p-3.5 shadow-md backdrop-blur-sm max-w-md my-1.5`}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg ${accentBg} border ${accentBorder} flex items-center justify-center ${accentText}`}>
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
          </div>
          <span className="text-xs font-semibold text-zinc-200">{label}</span>
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-medium ${accentText} ${accentBg} border ${accentBorder} px-2 py-0.5 rounded-full`}>
          {isLoading ? (
            <>
              <Loader2 className={`w-3 h-3 ${accentText} animate-spin`} />
              <span>Executing...</span>
            </>
          ) : isError ? (
            <>
              <XCircle className={`w-3 h-3 ${accentText}`} />
              <span>Failed</span>
            </>
          ) : (
            <>
              <CheckCircle2 className={`w-3 h-3 ${accentText}`} />
              <span>{badge}</span>
            </>
          )}
        </div>
      </div>

      {summary}

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
                {JSON.stringify(rawArgs, null, 2)}
              </pre>
            </div>
            {hasResult && (
              <div className="border-t border-zinc-800 pt-1 mt-1">
                <span className={accentText}>Output Result:</span>
                <pre className="text-zinc-300 whitespace-pre-wrap break-all text-[10px] mt-0.5">
                  {typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
