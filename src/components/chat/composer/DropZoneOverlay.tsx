'use client';

import React from 'react';
import { ImagePlus, AlertCircle } from 'lucide-react';

interface DropZoneOverlayProps {
  /** Whether a file drag is currently hovering over the composer. */
  isVisible: boolean;
  /** Whether image attachment is currently blocked. */
  isAttachDisabled?: boolean;
  /** Custom warning or state message when attachment is disabled. */
  disabledReason?: string;
}

/**
 * Visual dropzone overlay displayed over the composer when files are dragged
 * into the chat window. Styled using Milo design system tokens with subtle
 * animations and pointer-events-none to prevent event disruption.
 */
function DropZoneOverlay({
  isVisible,
  isAttachDisabled = false,
  disabledReason,
}: DropZoneOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl md:rounded-3xl border-2 border-dashed backdrop-blur-md transition-all duration-200 animate-in fade-in zoom-in-95 p-4 ${
        isAttachDisabled
          ? 'border-danger/60 bg-danger-soft/40 text-danger'
          : 'border-primary bg-primary-soft/35 dark:bg-primary-soft/25 text-primary shadow-glow-primary/25'
      }`}
    >
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full border shadow-button ${
          isAttachDisabled
            ? 'bg-danger/10 border-danger/30 text-danger'
            : 'bg-primary/15 border-primary/30 text-primary'
        }`}
      >
        {isAttachDisabled ? (
          <AlertCircle className="w-5 h-5 animate-pulse" />
        ) : (
          <ImagePlus className="w-5 h-5 animate-bounce" />
        )}
      </div>

      <div className="text-center">
        <p className="text-label font-bold tracking-tight">
          {isAttachDisabled
            ? disabledReason || 'Image attachment unavailable'
            : 'Drop images here to attach'}
        </p>
        <p className="text-caption text-text-muted mt-0.5 font-medium">
          {isAttachDisabled
            ? 'Wait for the current operation to finish'
            : 'JPEG, PNG, WebP, GIF • Up to 4 images'}
        </p>
      </div>
    </div>
  );
}

export default React.memo(DropZoneOverlay);
