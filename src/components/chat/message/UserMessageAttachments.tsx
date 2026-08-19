'use client';

import React from 'react';
import { ImageAttachmentInfo } from '@/lib/ai/message-segments';

/** Props for the UserMessageAttachments component. */
interface UserMessageAttachmentsProps {
  images: ImageAttachmentInfo[];
  className?: string;
}

/**
 * Custom shallow comparator so UserMessageAttachments only re-renders
 * when the actual image URLs or list change, not on every streaming token.
 */
function arePropsEqual(
  prev: UserMessageAttachmentsProps,
  next: UserMessageAttachmentsProps,
): boolean {
  if (prev.className !== next.className) return false;
  if (prev.images === next.images) return true;
  if (prev.images.length !== next.images.length) return false;
  for (let i = 0; i < prev.images.length; i++) {
    if (prev.images[i].url !== next.images[i].url) return false;
  }
  return true;
}

/**
 * Renders attached image thumbnails for sent user messages in the chat stream.
 * Purely presentational and optimized with async decoding and memoization.
 */
function UserMessageAttachments({ images, className = '' }: UserMessageAttachmentsProps) {
  if (!images || images.length === 0) return null;

  return (
    <div className={`flex flex-wrap justify-end gap-2 max-w-full ${className}`}>
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
  );
}

export default React.memo(UserMessageAttachments, arePropsEqual);
