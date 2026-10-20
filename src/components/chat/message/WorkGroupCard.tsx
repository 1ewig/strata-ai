'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Loader2, Workflow } from 'lucide-react';
import ThoughtAccordion from './ThoughtAccordion';
import ToolCallCard from './ToolCallCard';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import type { Segment } from '@/agent/client/segments';
import { accordionVariants, toolEntranceVariants } from '@/constants/animations';
import { estimateWorkGroupDuration } from '@/lib/timing';
import { useElapsedTimer } from '@/hooks/common/useElapsedTimer';

interface WorkGroupCardProps {
  items: Segment[];
  isStreaming?: boolean;
}

/**
 * Collapsible group wrapper for consecutive model reasoning and tool call items.
 * Displays a unified "Worked for X s" header trigger on the chat background,
 * and expands to reveal individual thought accordions and tool call cards.
 */
function WorkGroupCard({ items, isStreaming = false }: WorkGroupCardProps) {
  const [isOpen, setIsOpen] = useState(() => Boolean(isStreaming));
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

  const estimatedSeconds = React.useMemo(() => {
    return estimateWorkGroupDuration(items);
  }, [items]);

  const { displaySeconds } = useElapsedTimer(isStreaming, estimatedSeconds);

  if (!items || items.length === 0) return null;

  return (
    <motion.div
      variants={toolEntranceVariants}
      initial="hidden"
      animate="visible"
      className="w-full text-caption"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-fit flex items-center gap-1.5 py-1 text-text-muted hover:text-text-primary active:scale-[0.99] transition-all duration-150 text-left font-mono text-caption cursor-pointer group"
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

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="work-group-content"
            variants={accordionVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default React.memo(WorkGroupCard);
