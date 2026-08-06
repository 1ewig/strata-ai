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
      li: ({ children }: any) => <li className="text-caption leading-relaxed">{children}</li>,
      strong: ({ children }: any) => <strong className="font-semibold text-info">{children}</strong>,
      code: ({ children }: any) => (
        <code className="bg-surface-raised text-info px-1 py-0.5 rounded text-micro font-mono border border-edge-raised">
          {children}
        </code>
      ),
    }),
    [],
  );

  // Hide the whole accordion when there is no reasoning content to display.
  if (!text || !text.trim()) return null;

  return (
    <div className="my-1.5 w-full text-caption fade-in">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 py-1 text-text-muted hover:text-text-primary transition-colors text-left font-mono text-caption cursor-pointer group"
      >
        {isThinking ? (
          <Loader2 className="w-3.5 h-3.5 text-info animate-spin shrink-0" />
        ) : (
          <BrainCircuit className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary shrink-0" />
        )}
        <span className="font-semibold">{isThinking ? 'Thinking...' : 'Thought Process'}</span>
        <span className="text-micro text-text-muted font-normal">({text.length.toLocaleString()} chars)</span>
        <div className="flex items-center gap-1 text-text-muted">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-1 pl-5 py-1.5 text-label text-text-secondary leading-relaxed max-h-60 overflow-y-auto font-mono">
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
