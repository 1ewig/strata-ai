'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, X } from 'lucide-react';

/**
 * Props for the QuotaErrorCard component.
 */
interface QuotaErrorCardProps {
  error: {
    message: string;
    retryAfter?: number;
  };
  onDismiss?: () => void;
}

/**
 * Dismissible alert shown when the user's message quota is exhausted.
 * Displays the error message and, when retryAfter is provided, a live countdown to the quota reset.
 * @param error - Quota error payload; message is the user-facing text, retryAfter is seconds until reset.
 * @param onDismiss - Optional callback fired when the user dismisses the card.
 */
export function QuotaErrorCard({ error, onDismiss }: QuotaErrorCardProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | undefined>(error.retryAfter);

  // Tick down once per second, stopping the interval when the countdown reaches zero.
  useEffect(() => {
    if (secondsLeft === undefined || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === undefined || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  /**
   * Converts seconds into a compact "Xm Ys" countdown, or null once the quota should have reset.
   */
  const formatCountdown = (secs?: number) => {
    if (secs === undefined || secs <= 0) return null;
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    if (mins > 0) {
      return `${mins}m ${remainingSecs}s`;
    }
    return `${remainingSecs}s`;
  };

  const formattedTime = formatCountdown(secondsLeft);

  return (
    <div className="my-3 p-4 rounded-2xl bg-danger-soft/90 border border-danger/30 text-text-primary shadow-card backdrop-blur-sm transition-all animate-in fade-in zoom-in-95">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Quota icon */}
          <div className="w-9 h-9 rounded-xl bg-danger/15 text-danger flex items-center justify-center shrink-0 mt-0.5 shadow-glow-primary">
            <AlertCircle className="w-5 h-5" />
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-subheading font-semibold text-danger uppercase tracking-wider font-display">
                Usage Quota Reached
              </h4>
              {/* Live reset countdown, or a static "exhausted" pill when no retry time is known */}
              {formattedTime ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-base border border-danger/30 text-caption font-medium text-danger">
                  <Clock className="w-3 h-3 animate-pulse" />
                  Resets in {formattedTime}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-base border border-edge-raised text-caption font-medium text-text-muted">
                  Quota Exhausted
                </span>
              )}
            </div>

            <p className="text-body text-text-primary leading-relaxed font-medium">
              {error.message || 'You have reached your allocated message limit.'}
            </p>

            <div className="pt-1 text-caption text-text-muted flex items-center gap-3 flex-wrap">
              <span>Standard limits: <strong className="text-text-secondary">10 msgs / 5h</strong> &amp; <strong className="text-text-secondary">50 msgs / week</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Dismiss button, only rendered when an onDismiss handler is supplied */}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-surface-hover/70 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
