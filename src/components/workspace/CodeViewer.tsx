'use client';

import React, { useMemo } from 'react';
import { highlightCodeLines } from '@/lib/syntax-highlighter';

interface CodeViewerProps {
  /** The raw code content to display. */
  code: string;
  /** File name (e.g. 'index.html', 'app.ts') or language identifier. */
  filenameOrLanguage: string;
}

/**
 * High-performance, syntax-highlighted code viewer with perfectly aligned
 * line numbers, subtle row hover highlighting, and Milo theme token styling.
 */
export default React.memo(function CodeViewer({
  code,
  filenameOrLanguage,
}: CodeViewerProps) {
  // Split code into syntax-highlighted HTML lines
  const lines = useMemo(
    () => highlightCodeLines(code, filenameOrLanguage),
    [code, filenameOrLanguage]
  );

  return (
    <div className="overflow-x-auto w-full font-mono text-label leading-relaxed select-text">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((lineHtml, index) => (
            <tr
              key={index}
              className="leading-relaxed hover:bg-surface-hover/30 transition-colors [content-visibility:auto] [contain-intrinsic-size:0_26px]"
            >
              {/* Line Number Gutter */}
              <td
                aria-hidden="true"
                className="select-none text-right pr-4 pl-0 py-0 text-text-faint font-mono text-label w-[1%] whitespace-nowrap border-r border-edge-raised align-top"
              >
                {index + 1}
              </td>

              {/* Highlighted Code Line */}
              <td className="pl-4 pr-2 py-0 text-text-primary whitespace-pre align-top font-mono text-label">
                <span dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
