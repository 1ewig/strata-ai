'use client';

import React from 'react';
import { ImageAttachmentInfo } from '@/lib/ai/message-segments';

/** Props for the UserMessageAttachments component. */
interface UserMessageAttachmentsProps {
  images: ImageAttachmentInfo[];
  className?: string;
}

/**
 * Renders attached image thumbnails for sent user messages in the chat stream.
 * Purely presentational and optimized with React.memo.
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
          className="w-auto h-auto max-w-[130px] sm:max-w-[170px] max-h-36 object-contain rounded-xl border border-edge-raised shadow-button bg-surface-raised"
        />
      ))}
    </div>
  );
}

export default React.memo(UserMessageAttachments);
