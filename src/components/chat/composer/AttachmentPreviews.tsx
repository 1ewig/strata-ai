/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, FileText, FileSpreadsheet, FileJson, FileCode2 } from 'lucide-react';
import { ProcessedImage } from '@/lib/image-utils';
import { ProcessedDocument, formatFileSize } from '@/lib/document-utils';
import { attachmentThumbVariants } from '@/components/chat/animations';

/** Helper to render a semantic icon matching the document format. */
function getDocIcon(mediaType: string, filename: string) {
  const lower = filename.toLowerCase();
  if (mediaType === 'application/pdf' || lower.endsWith('.pdf')) {
    return <FileText className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
    return <FileSpreadsheet className="w-4 h-4 text-secondary shrink-0" />;
  }
  if (lower.endsWith('.json')) {
    return <FileJson className="w-4 h-4 text-info shrink-0" />;
  }
  if (
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.js') ||
    lower.endsWith('.jsx') ||
    lower.endsWith('.py') ||
    lower.endsWith('.html') ||
    lower.endsWith('.css') ||
    lower.endsWith('.sql') ||
    lower.endsWith('.rs') ||
    lower.endsWith('.go')
  ) {
    return <FileCode2 className="w-4 h-4 text-secondary shrink-0" />;
  }
  return <FileText className="w-4 h-4 text-text-secondary shrink-0" />;
}

/** Props for the pending attachment previews row. */
interface AttachmentPreviewsProps {
  images: ProcessedImage[];
  documents?: ProcessedDocument[];
  error: string | null;
  onRemoveImage: (index: number) => void;
  onRemoveDocument: (index: number) => void;
}

/**
 * Custom shallow comparator so AttachmentPreviews only re-renders when
 * attachment files or errors actually change.
 */
function areAttachmentPropsEqual(
  prev: AttachmentPreviewsProps,
  next: AttachmentPreviewsProps,
): boolean {
  if (
    prev.error !== next.error ||
    prev.onRemoveImage !== next.onRemoveImage ||
    prev.onRemoveDocument !== next.onRemoveDocument
  ) {
    return false;
  }
  if (prev.images !== next.images) {
    if (prev.images.length !== next.images.length) return false;
    for (let i = 0; i < prev.images.length; i++) {
      if (prev.images[i].dataUrl !== next.images[i].dataUrl) return false;
    }
  }
  const prevDocs = prev.documents || [];
  const nextDocs = next.documents || [];
  if (prevDocs !== nextDocs) {
    if (prevDocs.length !== nextDocs.length) return false;
    for (let i = 0; i < prevDocs.length; i++) {
      if (prevDocs[i].dataUrl !== nextDocs[i].dataUrl) return false;
    }
  }
  return true;
}

/**
 * Removable thumbnail and badge chip grid for image and document files
 * awaiting send, plus an inline attachment validation error line.
 */
function AttachmentPreviews({
  images,
  documents = [],
  error,
  onRemoveImage,
  onRemoveDocument,
}: AttachmentPreviewsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <AnimatePresence mode="popLayout">
        {/* Pending Images */}
        {images.map((image, index) => (
          <motion.div
            key={`img-${image.filename}-${index}`}
            variants={attachmentThumbVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
            className="group/img relative"
          >
            <img
              src={image.dataUrl}
              alt={image.filename}
              decoding="async"
              className="w-11 h-11 sm:w-13 sm:h-13 object-cover rounded-lg border border-edge-raised shadow-button [contain:paint] translate-z-0"
            />
            <button
              type="button"
              onClick={() => onRemoveImage(index)}
              className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-danger text-surface border border-surface shadow-button transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              title={`Remove ${image.filename}`}
              aria-label={`Remove ${image.filename}`}
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}

        {/* Pending Documents */}
        {documents.map((doc, index) => (
          <motion.div
            key={`doc-${doc.filename}-${index}`}
            variants={attachmentThumbVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
            className="group/doc relative flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-raised border border-edge-raised shadow-button text-text-primary max-w-[240px] sm:max-w-[280px]"
          >
            {getDocIcon(doc.mediaType, doc.filename)}
            <div className="flex flex-col min-w-0 pr-3">
              <span className="text-caption font-medium text-text-primary truncate">
                {doc.filename}
              </span>
              <span className="text-micro font-mono text-text-muted">
                {formatFileSize(doc.size)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemoveDocument(index)}
              className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-danger text-surface border border-surface shadow-button transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              title={`Remove ${doc.filename}`}
              aria-label={`Remove ${doc.filename}`}
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {error && (
        <span className="flex items-center gap-1.5 text-danger text-caption font-medium animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}

export default React.memo(AttachmentPreviews, areAttachmentPropsEqual);