'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MoreHorizontal, Copy, FileText, Check } from 'lucide-react';

interface MessageActionsMenuProps {
  textContent: string;
  isUser?: boolean;
  className?: string;
}

/**
 * Strips markdown formatting into clean plain text.
 */
function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\w-]*\n([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^\s*>\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Safe clipboard writer with legacy fallback for non-HTTPS / LAN mobile testing.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export default function MessageActionsMenu({
  textContent,
  isUser = false,
  className = '',
}: MessageActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<'markdown' | 'text' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close the menu on clicks/taps outside or Escape key
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
  }, [isOpen]);

  // Clean up feedback timers on unmount
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
    <div ref={menuRef} className={`relative inline-block ${className}`}>
      {/* 3-dots Trigger Button */}
      <button
        type="button"
        aria-label="Message options"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`
          flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150
          shadow-button backdrop-blur-sm cursor-pointer select-none active:scale-95
          ${isUser
            ? isOpen
              ? 'bg-surface/35 text-surface border-surface/50'
              : 'bg-surface/20 hover:bg-surface/30 text-surface border border-surface/30'
            : isOpen
              ? 'bg-surface-hover text-text-primary border-edge-hover'
              : 'bg-surface-elevated/90 hover:bg-surface-hover text-text-muted hover:text-text-primary border border-edge-raised'
          }
          ${isOpen ? 'opacity-100' : 'opacity-90 hover:opacity-100'}
        `}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Overflow Menu Dropdown */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`
            absolute right-0 top-full mt-1.5 z-30 min-w-[170px] max-w-[calc(100vw-32px)] p-1 rounded-xl
            bg-surface-elevated/95 backdrop-blur-md border border-edge-raised shadow-card-lg
            flex flex-col gap-0.5 animate-fade-in
          `}
        >
          {/* Copy as Markdown */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyMarkdown();
            }}
            className={`
              w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg
              text-caption font-medium transition-colors text-left cursor-pointer
              ${copiedType === 'markdown'
                ? 'bg-accent-olive-soft text-accent-olive'
                : 'text-text-primary hover:bg-surface-hover hover:text-text-bright'
              }
            `}
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
            className={`
              w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg
              text-caption font-medium transition-colors text-left cursor-pointer
              ${copiedType === 'text'
                ? 'bg-accent-olive-soft text-accent-olive'
                : 'text-text-primary hover:bg-surface-hover hover:text-text-bright'
              }
            `}
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