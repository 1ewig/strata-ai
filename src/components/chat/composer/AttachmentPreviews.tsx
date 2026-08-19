'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { ProcessedImage } from '@/lib/image-utils';

/** Props for the pending image attachment previews row. */
interface AttachmentPreviewsProps {
  images: ProcessedImage[];
  error: string | null;
  onRemove: (index: number) => void;
}

/**
 * Removable thumbnail grid for image files awaiting send, plus an inline
 * attachment validation/processing error line. Fully presentational - all
 * state and file processing live in the composer.
 */
function AttachmentPreviews({ images, error, onRemove }: AttachmentPreviewsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {images.map((image, index) => (
        <div key={`${image.filename}-${index}`} className="group/img relative">
          <img
            src={image.dataUrl}
            alt={image.filename}
            className="w-11 h-11 sm:w-13 sm:h-13 object-cover rounded-lg border border-edge-raised shadow-button"
          />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-danger text-surface border border-surface shadow-button transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            title={`Remove ${image.filename}`}
            aria-label={`Remove ${image.filename}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {error && (
        <span className="flex items-center gap-1.5 text-danger text-caption font-medium animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}

export default React.memo(AttachmentPreviews);