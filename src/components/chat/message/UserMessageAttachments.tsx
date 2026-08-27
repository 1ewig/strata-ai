import React from 'react';
import { FileText, FileSpreadsheet, FileJson, FileCode2 } from 'lucide-react';
import { ImageAttachmentInfo, DocumentAttachmentInfo } from '@/lib/ai/message-segments';
import { formatFileSize } from '@/lib/document-utils';

/** Props for the UserMessageAttachments component. */
interface UserMessageAttachmentsProps {
  images?: ImageAttachmentInfo[];
  documents?: DocumentAttachmentInfo[];
  className?: string;
}

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

/**
 * Custom shallow comparator so UserMessageAttachments only re-renders
 * when the actual attachments change, not on every streaming token.
 */
function arePropsEqual(
  prev: UserMessageAttachmentsProps,
  next: UserMessageAttachmentsProps,
): boolean {
  if (prev.className !== next.className) return false;
  if (prev.images !== next.images) {
    if (!prev.images || !next.images) return false;
    if (prev.images.length !== next.images.length) return false;
    for (let i = 0; i < prev.images.length; i++) {
      if (prev.images[i].url !== next.images[i].url) return false;
    }
  }
  if (prev.documents !== next.documents) {
    if (!prev.documents || !next.documents) return false;
    if (prev.documents.length !== next.documents.length) return false;
    for (let i = 0; i < prev.documents.length; i++) {
      if (prev.documents[i].url !== next.documents[i].url) return false;
    }
  }
  return true;
}

/**
 * Renders attached images and document badge chips for sent user messages.
 * Purely presentational and styled with the Milo design system.
 */
function UserMessageAttachments({ images, documents, className = '' }: UserMessageAttachmentsProps) {
  const hasImages = Array.isArray(images) && images.length > 0;
  const hasDocs = Array.isArray(documents) && documents.length > 0;

  if (!hasImages && !hasDocs) return null;

  return (
    <div className={`flex flex-col items-end gap-2 max-w-full ${className}`}>
      {/* Image Thumbnails */}
      {hasImages && (
        <div className="flex flex-wrap justify-end gap-2 max-w-full">
          {images.map((img, imgIdx) => (
            <img
              key={`${img.filename}-${imgIdx}`}
              src={img.url}
              alt={img.filename}
              loading="lazy"
              decoding="async"
              className="w-auto h-auto max-w-[130px] sm:max-w-[170px] max-h-36 object-contain rounded-xl border border-edge-raised shadow-button bg-surface-raised [contain:paint] translate-z-0"
            />
          ))}
        </div>
      )}

      {/* Document Badge Chips */}
      {hasDocs && (
        <div className="flex flex-wrap justify-end gap-2 max-w-full">
          {documents.map((doc, docIdx) => (
            <div
              key={`${doc.filename}-${docIdx}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-raised border border-edge-raised shadow-button text-text-primary max-w-[260px] sm:max-w-[320px] select-text"
              title={doc.filename}
            >
              {getDocIcon(doc.mediaType, doc.filename)}
              <div className="flex flex-col min-w-0">
                <span className="text-caption font-medium text-text-primary truncate">
                  {doc.filename}
                </span>
                {doc.size ? (
                  <span className="text-micro font-mono text-text-muted">
                    {formatFileSize(doc.size)}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(UserMessageAttachments, arePropsEqual);
