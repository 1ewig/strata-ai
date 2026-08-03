'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BrainCircuit, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

/**
 * Props for the ThoughtAccordion component.
 */
interface ThoughtAccordionProps {
  text: string;
  isThinking?: boolean;
}

/**
 * Collapsible panel that reveals a model's internal reasoning text, rendered as Markdown.
 * Hidden entirely when text is empty; shows a spinner and "Thinking..." header while the model is mid-thought.
 * @param text - The reasoning content shown inside the expanded body.
 * @param isThinking - When true, renders a loading spinner and "Thinking..." label in the header.
 */
function ThoughtAccordion({ text, isThinking }: ThoughtAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const markdownComponents = React.useMemo(
    () => ({
      p: ({ children }: any) => <p className="mb-2 leading-relaxed text-text-secondary">{children}</p>,
      ul: ({ children }: any) => <ul className="list-disc list-inside space-y-1 mb-2 text-text-muted">{children}</ul>,
      ol: ({ children }: any) => <ol className="list-decimal list-inside space-y-1 mb-2 text-text-muted">{children}</ol>,
      li: ({ children }: any) => <li className="text-[11px] leading-relaxed">{children}</li>,
      strong: ({ children }: any) => <strong className="font-semibold text-info">{children}</strong>,
      code: ({ children }: any) => (
        <code className="bg-surface-raised text-info px-1 py-0.5 rounded text-[10px] font-mono border border-edge-raised">
          {children}
        </code>
      ),
    }),
    [],
  );

  // Hide the whole accordion when there is no reasoning content to display.
  if (!text || !text.trim()) return null;

  return (
    <div className="my-1.5 rounded-xl border border-edge-raised/40 bg-surface-overlay/30 overflow-hidden text-xs fade-in">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-raised/60 hover:bg-surface-raised transition-colors text-left font-mono text-[11px] text-info cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {isThinking ? (
            <Loader2 className="w-3.5 h-3.5 text-info animate-spin" />
          ) : (
            <BrainCircuit className="w-3.5 h-3.5 text-info" />
          )}
          <span className="font-semibold">{isThinking ? 'Thinking...' : 'Thought Process'}</span>
          <span className="text-[10px] text-text-muted font-normal">({text.length.toLocaleString()} chars)</span>
        </div>
        <div className="flex items-center gap-1 text-text-muted">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-edge-raised/60 text-[11px] text-text-secondary leading-relaxed max-h-56 overflow-y-auto bg-surface-base/90 font-mono">
          {/* While actively thinking, render plain pre-wrap whitespace to avoid per-token Markdown AST parsing freeze */}
          {isThinking ? (
            <p className="whitespace-pre-wrap font-mono leading-relaxed text-text-secondary">{text}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {text}
            </ReactMarkdown>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(ThoughtAccordion);
