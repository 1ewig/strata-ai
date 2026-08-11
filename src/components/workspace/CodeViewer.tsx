'use client';

import React, { useMemo } from 'react';
import { highlightCodeLines } from '@/lib/syntax-highlighter';

interface CodeViewerProps {
  /** The raw code content to display. */
  code: string;
  /** File name (e.g. 'index.html', 'app.ts') or language identifier. */
  filenameOrLanguage: string;
  /** Optional custom class name for the wrapper. */
  className?: string;
}

/**
 * High-performance, syntax-highlighted code viewer with line numbers
 * and Milo theme token styling. Flows naturally within the workspace canvas.
 */
export default React.memo(function CodeViewer({
  code,
  filenameOrLanguage,
  className = '',
}: CodeViewerProps) {
  // Split code into syntax-highlighted HTML lines
  const lines = useMemo(
    () => highlightCodeLines(code, filenameOrLanguage),
    [code, filenameOrLanguage]
  );

  return (
    <div className={`overflow-x-auto flex font-mono text-label leading-relaxed select-text ${className}`}>
      {/* Line Numbers Gutter */}
      <div
        aria-hidden="true"
        className="select-none text-right pr-4 mr-4 border-r border-edge-raised text-text-faint font-mono text-micro min-w-[2.5rem] flex flex-col shrink-0"
      >
        {lines.map((_, index) => (
          <span key={index} className="leading-relaxed">
            {index + 1}
          </span>
        ))}
      </div>

      {/* Highlighted Code Lines */}
      <pre className="flex-1 overflow-x-auto m-0 p-0 text-text-primary">
        <code>
          {lines.map((lineHtml, index) => (
            <div
              key={index}
              className="leading-relaxed whitespace-pre"
              dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }}
            />
          ))}
        </code>
      </pre>
    </div>
  );
});
