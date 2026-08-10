'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BrainCircuit, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { createMarkdownComponents } from './create-markdown-components';

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
  const startTimeRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(1);

  // Compute estimated thought duration based on character count
  const estimatedSeconds = React.useMemo(() => {
    return Math.max(1, Math.round(text.length / 220));
  }, [text.length]);

  useEffect(() => {
    if (!isThinking) return;

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const seconds = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
        setElapsedSeconds(seconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isThinking]);

  const displaySeconds = isThinking ? elapsedSeconds : Math.max(elapsedSeconds, estimatedSeconds);

  const markdownComponents = React.useMemo(
    () => createMarkdownComponents('thought'),
    [],
  );

  // Hide the whole accordion when there is no reasoning content to display.
  if (!text || !text.trim()) return null;

  return (
    <div className="my-1.5 w-full text-caption">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 py-1 text-text-muted hover:text-text-primary transition-colors text-left font-mono text-caption cursor-pointer group"
      >
        {isThinking ? (
          <Loader2 className="w-3.5 h-3.5 text-info animate-spin shrink-0" />
        ) : (
          <BrainCircuit className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary shrink-0" />
        )}
        <span className="font-semibold">
          {isThinking ? `Thinking (${displaySeconds}s)...` : `Thought for ${displaySeconds}s`}
        </span>
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
