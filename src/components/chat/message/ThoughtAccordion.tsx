'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, ChevronDown, Loader2 } from 'lucide-react';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { accordionVariants } from '@/components/chat/animations';

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

  // Hide the whole accordion when there is no reasoning content to display.
  if (!text || !text.trim()) return null;

  return (
    <div className="my-1.5 w-full text-caption">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 py-1 text-text-muted hover:text-text-primary active:scale-[0.99] transition-all duration-150 text-left font-mono text-caption cursor-pointer group"
      >
        <BrainCircuit className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <span className="font-semibold">
          {isThinking ? `Thinking (${displaySeconds}s)` : `Thought for ${displaySeconds}s`}
        </span>
        {isThinking && (
          <Loader2 className="w-3.5 h-3.5 text-info animate-spin shrink-0" />
        )}
        <div className="flex items-center gap-1 text-text-muted group-hover:text-text-primary transition-colors">
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${
              isOpen ? 'rotate-180 text-text-primary' : ''
            }`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="thought-content"
            variants={accordionVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="overflow-hidden"
          >
            <div className="pl-5 py-1 text-label text-text-secondary leading-relaxed max-h-60 overflow-y-auto font-mono select-text cursor-text">
              {/* While actively thinking, render plain pre-wrap whitespace to avoid per-token Markdown AST parsing freeze */}
              {isThinking ? (
                <p className="whitespace-pre-wrap font-mono leading-relaxed text-text-secondary select-text cursor-text">{text}</p>
              ) : (
                <MarkdownRenderer content={text} variant="thought" className="text-label text-text-secondary leading-relaxed select-text cursor-text" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default React.memo(ThoughtAccordion);
