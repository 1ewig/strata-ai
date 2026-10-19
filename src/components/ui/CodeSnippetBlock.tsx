'use client';

import React, { useState, memo, useCallback } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { useHighlightedCode } from '@/lib/code/shiki-highlighter';
import { useTheme } from '@/hooks/common/useTheme';
import { downloadWorkspaceFile } from '@/lib/workspace/download';

export interface CodeSnippetBlockProps {
  rawCode: string;
  rawLang: string;
  className?: string;
  borderClass: string;
  extraClass?: string;
  enableCopy?: boolean;
  children?: React.ReactNode;
}

export const CodeSnippetBlock = memo(
  function CodeSnippetBlock({
    rawCode,
    rawLang,
    className,
    borderClass,
    extraClass = '',
    enableCopy = true,
    children,
  }: CodeSnippetBlockProps) {
    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const { isDark } = useTheme();

    React.useEffect(() => {
      return () => {
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
      };
    }, []);

    const effectiveTheme = isDark ? 'dark' : 'light';
    const { html, isHighlighted } = useHighlightedCode(rawCode, rawLang, effectiveTheme);

    const handleCopy = useCallback(async () => {
      if (!rawCode) return;
      try {
        await navigator.clipboard.writeText(rawCode);
        setCopied(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback if clipboard API is unavailable
      }
    }, [rawCode]);

    const handleDownload = useCallback(() => {
      if (!rawCode) return;
      downloadWorkspaceFile({
        name: 'snippet',
        content: rawCode,
        language: rawLang,
      });
    }, [rawCode, rawLang]);

    const displayLabel = rawLang ? rawLang.toUpperCase() : 'CODE';

    return (
      <div className={`my-2.5 rounded-xl bg-surface-base border ${borderClass} overflow-hidden font-mono text-micro shadow-card [contain:paint_layout] ${extraClass}`}>
        {/* Header bar */}
        <div className="bg-surface-raised/90 px-3 py-1.5 border-b border-edge-raised text-micro text-text-muted font-semibold uppercase tracking-wider flex items-center justify-between select-none">
          <span className="text-text-muted font-mono">{displayLabel}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownload}
              aria-label="Download code snippet"
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover/60 transition-colors cursor-pointer"
              title="Download snippet"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            {enableCopy && (
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy code"
                className="flex items-center gap-1 py-0.5 px-1.5 rounded text-micro text-text-muted hover:text-text-primary hover:bg-surface-hover/60 active:scale-95 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-primary animate-in zoom-in-75 duration-100" />
                    <span className="text-primary font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Code body */}
        {isHighlighted && html ? (
          <pre className="p-3 overflow-x-auto text-text-primary leading-relaxed whitespace-pre m-0">
            <code dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
        ) : (
          <pre className="p-3 overflow-x-auto text-text-primary leading-relaxed whitespace-pre m-0">
            <code className={className}>{children ?? rawCode}</code>
          </pre>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.rawCode === next.rawCode &&
    prev.rawLang === next.rawLang &&
    prev.borderClass === next.borderClass &&
    prev.extraClass === next.extraClass &&
    prev.enableCopy === next.enableCopy
);

export default CodeSnippetBlock;
