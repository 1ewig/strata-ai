'use client';

import React, { useState, useRef, useEffect } from 'react';

/**
 * Props for the RateLimitRing component.
 */
interface RateLimitRingProps {
  rateLimitData: {
    remaining5h: number;
    remainingWeek: number;
    retryAfter?: number;
  } | null;
  isQuotaExhausted: boolean;
}

/**
 * Compact quota indicator showing how many messages remain in the current 5-hour window.
 * Renders a progress ring plus a hover/tap popover with details for both quota windows.
 * Renders nothing when rateLimitData is null.
 * @param rateLimitData - Remaining message counts for the 5-hour and 7-day windows, plus an optional reset delay; null hides the indicator.
 * @param isQuotaExhausted - When true, styles the badge and popover with danger colors and labels the quota as exhausted.
 */
export default function RateLimitRing({ rateLimitData, isQuotaExhausted }: RateLimitRingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ringRef = useRef<HTMLDivElement>(null);

  // Close the popover when clicking or tapping outside on mobile/desktop
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (ringRef.current && !ringRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  if (!rateLimitData) return null;

  return (
    <div ref={ringRef} className="relative group flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1.5 px-2 py-0.5 h-6.5 rounded-lg bg-surface-base border text-caption font-medium cursor-pointer transition-colors ${
          isQuotaExhausted ? 'border-danger/40 bg-danger-soft/40' : 'border-edge-raised'
        }`}
        aria-label="Toggle quota status popover"
      >
        <svg className="w-3.5 h-3.5 -rotate-90" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            r="7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className="text-edge-default"
          />
          {/* Foreground arc: full circle circumference is 43.98 (2 * PI * 7); the offset hides the
              unused portion so the visible arc equals the fraction of the 10-message budget remaining */}
          <circle
            cx="10"
            cy="10"
            r="7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeDasharray={43.98}
            strokeDashoffset={43.98 * (1 - Math.min(1, Math.max(0, rateLimitData.remaining5h / 10)))}
            strokeLinecap="round"
            className={`transition-all duration-500 ${
              rateLimitData.remaining5h > 3
                ? 'text-primary'
                : rateLimitData.remaining5h > 1
                ? 'text-warning'
                : 'text-danger'
            }`}
          />
        </svg>
        <span className={`text-caption font-medium ${isQuotaExhausted ? 'text-danger font-semibold' : 'text-text-muted'}`}>
          {rateLimitData.remaining5h} left
        </span>
      </button>

      {/* Popover Tooltip on Hover & Tap */}
      <div
        className={`absolute bottom-full right-0 mb-2 ${
          isOpen ? 'block' : 'hidden group-hover:block'
        } w-56 max-w-[calc(100vw-2rem)] bg-surface-elevated border border-edge-hover rounded-xl shadow-2xl p-2.5 text-caption text-text-primary z-50 animate-in fade-in zoom-in-95`}
      >
        <div className="font-semibold text-text-bright mb-1.5 flex items-center justify-between">
          <span>Remaining Messages</span>
          <span className={`text-micro font-semibold uppercase px-1.5 py-0.5 rounded ${
            isQuotaExhausted ? 'bg-danger/15 text-danger' : 'bg-surface-base text-text-faint'
          }`}>
            {isQuotaExhausted ? 'Exhausted' : 'Quota'}
          </span>
        </div>
        <div className="space-y-1.5 text-caption text-text-muted">
          <div className="flex items-center justify-between">
            <span>5-hour window:</span>
            <span className={`font-semibold ${rateLimitData.remaining5h === 0 ? 'text-danger' : 'text-primary'}`}>
              {rateLimitData.remaining5h} of 10 left
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>7-day window:</span>
            <span className={`font-semibold ${rateLimitData.remainingWeek === 0 ? 'text-danger' : 'text-primary'}`}>
              {rateLimitData.remainingWeek} of 50 left
            </span>
          </div>
          {rateLimitData.retryAfter && (
            <div className="pt-1 border-t border-edge-default text-micro text-danger flex items-center justify-between font-medium">
              <span>Resets in:</span>
              <span>~{Math.ceil(rateLimitData.retryAfter / 60)} minutes</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
