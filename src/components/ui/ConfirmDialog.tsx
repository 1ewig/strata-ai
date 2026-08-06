'use client';

import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export interface ConfirmDialogProps {
  /** Whether the dialog is visible. */
  isOpen: boolean;
  /** Dialog heading title. */
  title: string;
  /** Explanatory message or React content. */
  description: React.ReactNode;
  /** Label for the primary action button (default "Confirm"). */
  confirmLabel?: string;
  /** Label for the cancellation button (default "Cancel"). */
  cancelLabel?: string;
  /** Visual theme variant: 'danger' for destructive actions, 'primary' for normal confirmations. */
  variant?: 'danger' | 'primary';
  /** Whether the action is currently executing. */
  isLoading?: boolean;
  /** Callback fired when the user confirms the action. */
  onConfirm: () => void;
  /** Callback fired when the dialog is dismissed or cancelled. */
  onCancel: () => void;
}

/**
 * Reusable modal dialog component for destructive and important confirmations
 * (e.g., signing out, deleting workspace files). Responsive layout optimized
 * for touch targets on mobile and keyboard navigation (Escape key) on desktop.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Close modal when pressing the Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  // Focus the confirm button when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => confirmButtonRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isLoading) onCancel();
          }}
          className="fixed inset-0 bg-scrim backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-surface-raised border border-edge-raised rounded-2xl shadow-card-lg p-5 sm:p-6 z-10 my-auto text-left"
        >
          {/* Header Row: Icon & Title */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isDanger
                    ? 'bg-danger-soft text-danger border border-danger/30'
                    : 'bg-primary-soft text-primary border border-primary/30'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3
                id="confirm-dialog-title"
                className="text-subheading font-display font-bold text-text-bright"
              >
                {title}
              </h3>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Description */}
          <div className="mt-3 text-body text-text-secondary leading-relaxed">
            {description}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2.5 flex-col-reverse sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-label font-medium text-text-muted hover:text-text-primary hover:bg-surface-hover/60 border border-edge-raised transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              ref={confirmButtonRef}
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-label font-semibold transition-all cursor-pointer shadow-button disabled:opacity-50 disabled:cursor-not-allowed ${
                isDanger
                  ? 'bg-danger hover:bg-danger/90 text-surface'
                  : 'bg-primary hover:bg-primary-hover text-surface'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{confirmLabel}</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
