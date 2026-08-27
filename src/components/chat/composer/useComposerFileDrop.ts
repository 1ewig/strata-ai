'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  processImageFile,
  validateImageFile,
  type ProcessedImage,
} from '@/lib/image-utils';
import {
  processDocumentFile,
  validateDocumentFile,
  type ProcessedDocument,
} from '@/lib/document-utils';

export interface UseComposerFileDropOptions {
  /** Whether the active model can accept vision inputs. */
  supportsVision: boolean;
  /** Whether attachment is currently disabled (e.g. streaming, blocked quota). */
  isAttachDisabled: boolean;
  /** Current combined number of pending attachments in the composer. */
  attachedCount: number;
  /** Maximum number of attachments allowed per message. */
  maxAttachments: number;
  /** Callback invoked when new valid images are processed. */
  onImagesAttached: (images: ProcessedImage[]) => void;
  /** Callback invoked when new valid documents are processed. */
  onDocumentsAttached: (documents: ProcessedDocument[]) => void;
  /** Callback to surface inline error messages to the user. */
  onError: (error: string | null) => void;
}

/**
 * Custom hook managing drag-and-drop and clipboard paste interactions for the
 * chat message composer. Accepts both images (for vision models) and documents
 * (PDF, Markdown, TXT, CSV, JSON, code).
 */
export function useComposerFileDrop({
  supportsVision,
  isAttachDisabled,
  attachedCount,
  maxAttachments,
  onImagesAttached,
  onDocumentsAttached,
  onError,
}: UseComposerFileDropOptions) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragDepthRef = useRef(0);

  /**
   * Processes an array of raw Files, validates them against limits and MIME types,
   * processes them asynchronously, and invokes the attachment callbacks.
   */
  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      if (isAttachDisabled) return;

      const availableSlots = maxAttachments - attachedCount;
      if (availableSlots <= 0) {
        onError(`Maximum of ${maxAttachments} attachments per message reached.`);
        return;
      }

      onError(null);
      const filesToProcess = files.slice(0, availableSlots);
      if (files.length > availableSlots) {
        onError(
          `Only ${availableSlots} file${availableSlots === 1 ? '' : 's'} could be attached (limit: ${maxAttachments}).`
        );
      }

      const processedImages: ProcessedImage[] = [];
      const processedDocs: ProcessedDocument[] = [];

      for (const file of filesToProcess) {
        if (file.type.startsWith('image/')) {
          if (!supportsVision) {
            onError(`Model does not support images. Could not attach "${file.name}".`);
            continue;
          }
          const validationError = validateImageFile(file);
          if (validationError) {
            onError(validationError);
            continue;
          }
          try {
            processedImages.push(await processImageFile(file));
          } catch {
            onError(`Could not process image "${file.name}".`);
          }
        } else {
          const docValidationError = validateDocumentFile(file);
          if (docValidationError) {
            onError(docValidationError);
            continue;
          }
          try {
            processedDocs.push(await processDocumentFile(file));
          } catch {
            onError(`Could not process document "${file.name}".`);
          }
        }
      }

      if (processedImages.length > 0) {
        onImagesAttached(processedImages);
      }
      if (processedDocs.length > 0) {
        onDocumentsAttached(processedDocs);
      }
    },
    [supportsVision, isAttachDisabled, attachedCount, maxAttachments, onImagesAttached, onDocumentsAttached, onError]
  );

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only activate drag-over state if the drag payload includes files
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      dragDepthRef.current += 1;
      setIsDraggingOver(true);
    }
  }, []);

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = isAttachDisabled ? 'none' : 'copy';
    },
    [isAttachDisabled]
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDraggingOver(false);
    }
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragDepthRef.current = 0;
      setIsDraggingOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files || []);
      if (droppedFiles.length === 0) return;

      await handleFiles(droppedFiles);
    },
    [handleFiles]
  );

  const onPaste = useCallback(
    async (e: React.ClipboardEvent) => {
      if (!e.clipboardData || !e.clipboardData.items) return;

      const fileItems = Array.from(e.clipboardData.items).filter(
        (item) => item.kind === 'file'
      );

      if (fileItems.length === 0) return;

      // Prevent default binary paste when files are detected
      e.preventDefault();

      const files = fileItems
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      await handleFiles(files);
    },
    [handleFiles]
  );

  return {
    isDraggingOver,
    dragHandlers: {
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
      onPaste,
    },
  };
}
