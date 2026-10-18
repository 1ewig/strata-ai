'use client';

import React from 'react';
import { Check, Code2 } from 'lucide-react';
import { highlightCode } from '@/lib/code/syntax-highlighter';
import { getLanguageLabel } from '@/lib/code/languages';
import { useCopyClipboard } from '@/hooks/common/useCopyClipboard';

export interface CodeSnippetBlockProps {
  rawCode: string;
  rawLang: string;
  className?: string;
  borderClass: string;
  extraClass?: string;
  enableCopy?: boolean;
}

export const CodeSnippetBlock = React.memo(function CodeSnippetBlock({
  rawCode,
  rawLang,
  className,
  borderClass,
  extraClass = '',
  enableCopy = false,
}: CodeSnippetBlockProps) {
  const { copied, copy } = useCopyClipboard(2000);
  const displayLabel = rawLang ? getLanguageLabel(rawLang) : 'Code';
  const highlightedHtml = React.useMemo(() => highlightCode(rawCode, rawLang), [rawCode, rawLang]);

  return (
    <div className={`my-2.5 rounded-xl bg-surface-base border ${borderClass} overflow-hidden font-mono text-micro shadow-card ${extraClass}`}>
      <div className="bg-surface-raised/90 px-3 py-1.5 border-b border-edge-raised text-micro text-text-muted font-semibold uppercase tracking-wider flex items-center justify-between">
        <span className="text-text-muted font-mono">{displayLabel}</span>
        {enableCopy && (
          <button
            type="button"
            onClick={() => copy(rawCode)}
            className="flex items-center gap-1 text-micro text-text-muted hover:text-primary active:scale-90 hover:scale-105 transition-all duration-150 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-primary animate-in zoom-in-75 duration-100" />
                <span className="text-primary font-medium">Copied</span>
              </>
            ) : (
              <>
                <Code2 className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
      <pre className="p-3 overflow-x-auto text-text-primary leading-relaxed">
        <code
          className={className}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>
    </div>
  );
});

export default CodeSnippetBlock;
