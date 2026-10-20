'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Copy, FileText, Check } from 'lucide-react';
import { copyToClipboard, stripMarkdown } from '@/lib/clipboard';
import { useClickOutside } from '@/hooks/common/useClickOutside';

export interface MessageActionsMenuProps {
  textContent: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  align?: 'left' | 'right';
  direction?: 'up' | 'down';
}

export default function MessageActionsMenu({
  textContent,
  isOpen: controlledIsOpen,
  onOpenChange,
  className = '',
  align = 'right',
  direction = 'down',
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

  const [effectiveDirection, setEffectiveDirection] = useState<'up' | 'down'>(direction);
  const [maxMenuHeight, setMaxMenuHeight] = useState<number | undefined>(undefined);
  const [copiedType, setCopiedType] = useState<'markdown' | 'text' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close menu on clicks/taps outside or on Escape
  useClickOutside(menuRef, () => setIsOpen(false), { enabled: isOpen });

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Ensure menu stays contained within viewport dvh on both mobile and desktop
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const updatePositionAndContainment = () => {
      if (!menuRef.current) return;
      const rect = menuRef.current.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const menuEstimatedHeight = 90;
      const padding = 12; // safe distance from viewport edges

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let chosenDirection = direction;
      if (direction === 'up' && spaceAbove < menuEstimatedHeight && spaceBelow > spaceAbove) {
        chosenDirection = 'down';
      } else if (direction === 'down' && spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow) {
        chosenDirection = 'up';
      }

      setEffectiveDirection(chosenDirection);

      // Clamp max height to available space within dvh
      const availableSpace = chosenDirection === 'up' ? spaceAbove - padding : spaceBelow - padding;
      if (availableSpace > 0) {
        setMaxMenuHeight(Math.max(48, Math.floor(availableSpace)));
      } else {
        setMaxMenuHeight(undefined);
      }
    };

    updatePositionAndContainment();
    window.addEventListener('resize', updatePositionAndContainment);
    window.addEventListener('scroll', updatePositionAndContainment, true);

    return () => {
      window.removeEventListener('resize', updatePositionAndContainment);
      window.removeEventListener('scroll', updatePositionAndContainment, true);
    };
  }, [isOpen, direction]);

  const triggerCopyFeedback = useCallback(
    (type: 'markdown' | 'text') => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      setCopiedType(type);
      // Show feedback and reset it after a few seconds without dismissing the menu
      resetTimerRef.current = setTimeout(() => {
        setCopiedType(null);
      }, 2000);
    },
    [],
  );

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
    <div ref={menuRef} className={`relative inline-block ${isOpen ? 'z-20' : ''} ${className}`}>
      {/* Copy Trigger Button */}
      <button
        type="button"
        aria-label="Copy message"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer active:scale-95 flex items-center justify-center border ${
          isOpen
            ? 'bg-surface-elevated text-text-bright border-edge-hover shadow-button'
            : 'border-transparent text-text-muted hover:text-text-primary hover:bg-surface-hover/80 active:bg-surface-hover'
        }`}
        title="Copy message"
      >
        {copiedType ? (
          <Check className="w-3.5 h-3.5 text-accent-olive" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          style={{ maxHeight: maxMenuHeight ? `${maxMenuHeight}px` : undefined }}
          className={`absolute ${effectiveDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${
            align === 'left' ? 'left-0' : 'right-0'
          } z-50 min-w-[170px] max-w-[calc(100vw-32px)] max-h-[calc(100dvh-24px)] overflow-y-auto overscroll-contain p-1 rounded-xl bg-surface-elevated/95 backdrop-blur-md border border-edge-raised shadow-card-lg flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Copy as Markdown */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyMarkdown();
            }}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-caption font-medium transition-colors text-left cursor-pointer ${
              copiedType === 'markdown'
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
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-caption font-medium transition-colors text-left cursor-pointer ${
              copiedType === 'text'
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