'use client';

import React from 'react';
import { CornerDownRight } from 'lucide-react';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

export interface NarrationTextProps {
  content: string;
}

/**
 * Inline narration the model emits between tool calls and thoughts
 * ("Sure — let me check..."). Visually distinct from italic reasoning
 * bodies and the final 16px assistant response: non-italic 14px
 * secondary text with a corner-arrow marker.
 */
function NarrationText({ content }: NarrationTextProps) {
  if (!content || !content.trim()) return null;

  return (
    <div className="flex items-start gap-1.5 w-full min-w-0 text-label text-text-secondary select-text cursor-text">
      <CornerDownRight className="w-3.5 h-3.5 text-text-muted shrink-0 mt-1" />
      <div className="leading-relaxed min-w-0 flex-1">
        <MarkdownRenderer
          content={content}
          variant="thought"
          className="text-label text-text-secondary leading-relaxed select-text cursor-text"
        />
      </div>
    </div>
  );
}

export default React.memo(NarrationText);
