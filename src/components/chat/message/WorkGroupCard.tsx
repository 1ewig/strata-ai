'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Loader2, Workflow } from 'lucide-react';
import ThoughtAccordion from './ThoughtAccordion';
import ToolCallCard from './ToolCallCard';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { Segment } from '@/lib/ai/message-segments';

interface WorkGroupCardProps {
  items: Segment[];
  isStreaming?: boolean;
  onOpenDrawer?: () => void;
}

/**
 * Collapsible group wrapper for consecutive model reasoning and tool call items.
 * Displays a unified "Worked for X s" header trigger on the chat background,
 * and expands to reveal individual thought accordions and tool call cards.
 */
function WorkGroupCard({ items, isStreaming, onOpenDrawer }: WorkGroupCardProps) {
  const [isOpen, setIsOpen] = useState(() => Boolean(isStreaming));
  const startTimeRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(1);
  const prevStreamingRef = useRef(isStreaming);

  // While working/streaming, keep open so thoughts & tools display live; collapse when work finishes.
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      setIsOpen(false);
    } else if (!prevStreamingRef.current && isStreaming) {
      setIsOpen(true);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Compute estimated duration for historical or non-streaming messages
  const estimatedSeconds = React.useMemo(() => {
    let toolCount = 0;
    let reasoningChars = 0;
    items.forEach((item) => {
      if (item.type === 'tool') toolCount += 1;
      if (item.type === 'reasoning' && item.content) {
        reasoningChars += item.content.length;
      }
    });
    return Math.max(1, Math.ceil(toolCount * 1.5 + reasoningChars / 250));
  }, [items]);

  useEffect(() => {
    if (!isStreaming) return;

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
  }, [isStreaming]);

  const displaySeconds = isStreaming ? elapsedSeconds : Math.max(elapsedSeconds, estimatedSeconds);

  if (!items || items.length === 0) return null;

  return (
    <div className="my-1.5 w-full text-caption fade-in">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 py-1 text-text-muted hover:text-text-primary active:scale-[0.99] transition-all duration-150 text-left font-mono text-caption cursor-pointer group"
      >
        <Workflow className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <span className="font-semibold">
          {isStreaming ? `Working (${displaySeconds}s)` : `Worked for ${displaySeconds}s`}
        </span>
        {isStreaming && (
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

      {isOpen && (
        <div className="mt-1 pl-3 border-l border-edge-raised/50 space-y-1 my-1">
          {items.map((item, idx) => {
            const isLastItem = idx === items.length - 1;
            if (item.type === 'reasoning' && item.content) {
              return (
                <ThoughtAccordion
                  key={item.key}
                  text={item.content}
                  isThinking={isStreaming && isLastItem}
                />
              );
            }
            if (item.type === 'tool') {
              return (
                <ToolCallCard
                  key={item.key}
                  part={item.part}
                  onOpenDrawer={onOpenDrawer}
                />
              );
            }
            if (item.type === 'text' && item.content) {
              return (
                <div key={item.key} className="text-body select-text cursor-text">
                  <MarkdownRenderer content={item.content} variant="thought" className="text-body select-text cursor-text" />
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

export default React.memo(WorkGroupCard);
