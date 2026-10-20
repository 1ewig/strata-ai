'use client';

import React, { useState, useRef } from 'react';
import { Globe, ExternalLink, X } from 'lucide-react';
import type { WebSource } from '@/lib/urls';
import { extractDomain } from '@/lib/urls';
import { FaviconImage } from '@/components/ui/FaviconImage';
import { useClickOutside } from '@/hooks/common/useClickOutside';

export interface MessageSourcesButtonProps {
  sources: WebSource[];
  className?: string;
}

/**
 * Plurality-aware sources trigger button rendered in the assistant message footer alongside
 * MessageActionsMenu. Opens a lightweight floating popover anchored right above the button,
 * listing cited web search results and extracted URLs with favicons and external links.
 */
export function MessageSourcesButton({ sources, className = '' }: MessageSourcesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsOpen(false), { enabled: isOpen });

  if (!sources || sources.length === 0) return null;

  const count = sources.length;
  const label = `${count} ${count === 1 ? 'source' : 'sources'}`;

  return (
    <div ref={containerRef} className={`relative inline-block ${isOpen ? 'z-20' : ''} ${className}`}>
      {/* Sources Pill Trigger Button */}
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`px-2 py-1 rounded-lg text-caption font-mono transition-all duration-150 cursor-pointer active:scale-95 flex items-center gap-1.5 border ${
          isOpen
            ? 'bg-surface-elevated text-text-bright border-edge-hover shadow-button'
            : 'border-edge-default/80 bg-surface-raised text-text-muted hover:text-text-primary hover:bg-surface-hover/80 hover:border-edge-hover shadow-xs'
        }`}
        title="View cited web sources"
      >
        <Globe className="w-3.5 h-3.5 text-info shrink-0" />
        <span className="font-medium text-text-primary text-micro">{label}</span>
      </button>

      {/* Floating Popover Anchored Right Above */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Web Sources"
          className="absolute bottom-full mb-1.5 left-0 z-50 w-72 sm:w-80 max-w-[calc(100vw-32px)] p-2 rounded-xl bg-surface-elevated/95 backdrop-blur-md border border-edge-raised shadow-card-lg flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-1.5 py-0.5 text-micro font-mono text-text-muted uppercase tracking-wider border-b border-edge-default/60 pb-1.5">
            <div className="flex items-center gap-1.5 text-text-secondary font-medium">
              <Globe className="w-3.5 h-3.5 text-info" />
              <span>Web Sources ({count})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
              aria-label="Close sources popover"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sources List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 overscroll-contain pr-0.5">
            {sources.map((source) => {
              const domain = extractDomain(source.url);
              return (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-left"
                >
                  <FaviconImage
                    url={source.url}
                    faviconUrl={source.favicon}
                    className="w-4 h-4 rounded-xs shrink-0 mt-0.5"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-caption font-medium text-text-primary group-hover:text-primary transition-colors line-clamp-1 break-words">
                      {source.title || domain}
                    </span>
                    <span className="text-micro font-mono text-text-muted truncate">
                      {domain}
                    </span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-text-muted group-hover:text-primary shrink-0 mt-0.5 transition-colors opacity-60 group-hover:opacity-100" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(MessageSourcesButton);
