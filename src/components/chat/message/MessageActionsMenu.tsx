'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MoreHorizontal, Copy, FileText, Check } from 'lucide-react';
import { copyToClipboard, stripMarkdown } from '@/lib/clipboard';

interface MessageActionsMenuProps {
  textContent: string;
  isUser?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export default function MessageActionsMenu({
  textContent,
  isOpen: controlledIsOpen,
  onOpenChange,
  className = '',
}: MessageActionsMenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setIsOpen = useCallback(
    (nextState: boolean | ((prev: boolean) => boolean)) => {
      const nextVal = typeof nextState === 'function' ? nextState(isOpen) : nextState;
      if (onOpenChange) {
        onOpenChange(nextVal);
      }
      if (!isControlled) {
        setInternalIsOpen(nextVal);
      }
    },
    [isOpen, isControlled, onOpenChange],
  );

  const [copiedType, setCopiedType] = useState<'markdown' | 'text' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close menu on clicks/taps outside or on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const triggerCopyFeedback = useCallback((type: 'markdown' | 'text') => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setCopiedType(type);
    resetTimerRef.current = setTimeout(() => {
      setCopiedType(null);
    }, 1500);
  }, []);

  const handleCopyMarkdown = useCallback(async () => {
    const ok = await copyToClipboard(textContent);
    if (ok) triggerCopyFeedback('markdown');
  }, [textContent, triggerCopyFeedback]);

  const handleCopyPlainText = useCallback(async () => {
    const plain = stripMarkdown(textContent);
    const ok = await copyToClipboard(plain);
    if (ok) triggerCopyFeedback('text');
  }, [textContent, triggerCopyFeedback]);

  if (!textContent.trim()) return null;

  return (
    <div ref={menuRef} className={`relative inline-block ${isOpen ? 'z-30' : ''} ${className}`}>
      {/* Menu Trigger Button */}
      <button
        type="button"
        aria-label="Message options"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`p-1.5 text-text-muted hover:text-text-primary active:scale-95 rounded-lg border transition-all duration-150 cursor-pointer ${isOpen
            ? 'bg-surface-elevated text-text-primary border-edge-hover shadow-button'
            : 'hover:bg-surface-elevated border-transparent hover:border-edge-raised'
          }`}
        title="Message options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-1.5 z-30 min-w-[170px] max-w-[calc(100vw-32px)] p-1 rounded-xl bg-surface-elevated/95 backdrop-blur-md border border-edge-raised shadow-card-lg flex flex-col gap-0.5 animate-fade-in"
        >
          {/* Copy as Markdown */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyMarkdown();
            }}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-caption font-medium transition-colors text-left cursor-pointer ${copiedType === 'markdown'
                ? 'bg-accent-olive-soft text-accent-olive'
                : 'text-text-primary hover:bg-surface-hover hover:text-text-bright'
              }`}
          >
            <div className="flex items-center gap-2">
              {copiedType === 'markdown' ? (
                <Check className="w-3.5 h-3.5 text-accent-olive shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-text-secondary shrink-0" />
              )}
              <span>{copiedType === 'markdown' ? 'Copied Markdown!' : 'Copy as Markdown'}</span>
            </div>
          </button>

          {/* Copy as Plain Text */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyPlainText();
            }}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-caption font-medium transition-colors text-left cursor-pointer ${copiedType === 'text'
                ? 'bg-accent-olive-soft text-accent-olive'
                : 'text-text-primary hover:bg-surface-hover hover:text-text-bright'
              }`}
          >
            <div className="flex items-center gap-2">
              {copiedType === 'text' ? (
                <Check className="w-3.5 h-3.5 text-accent-olive shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-text-secondary shrink-0" />
              )}
              <span>{copiedType === 'text' ? 'Copied Plain Text!' : 'Copy as Plain Text'}</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}