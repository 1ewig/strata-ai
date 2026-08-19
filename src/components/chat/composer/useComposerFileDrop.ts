'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  processImageFile,
  validateImageFile,
  type ProcessedImage,
} from '@/lib/image-utils';

export interface UseComposerFileDropOptions {
  /** Whether the active model can accept vision inputs. */
  supportsVision: boolean;
  /** Whether attachment is currently disabled (e.g. streaming, blocked quota). */
  isAttachDisabled: boolean;
  /** Current number of pending image attachments in the composer. */
  attachedCount: number;
  /** Maximum number of image attachments allowed per message. */
  maxImages: number;
  /** Callback invoked when new valid images are processed. */
  onImagesAttached: (images: ProcessedImage[]) => void;
  /** Callback to surface inline error messages to the user. */
  onError: (error: string | null) => void;
}

/**
 * Custom hook managing drag-and-drop and clipboard paste interactions for the
 * chat message composer. Provides drag depth tracking to prevent child-element
 * flickering and processes valid image files into wire-ready data URLs.
 */
export function useComposerFileDrop({
  supportsVision,
  isAttachDisabled,
  attachedCount,
  maxImages,
  onImagesAttached,
  onError,
}: UseComposerFileDropOptions) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragDepthRef = useRef(0);

  /**
   * Processes an array of raw Files, validates them against limits and MIME types,
   * compresses them asynchronously, and invokes onImagesAttached.
   */
  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      if (!supportsVision) {
        onError('The selected model does not support image attachments.');
        return;
      }

      if (isAttachDisabled) return;

      const availableSlots = maxImages - attachedCount;
      if (availableSlots <= 0) {
        onError(`Maximum of ${maxImages} images per message reached.`);
        return;
      }

      onError(null);
      const filesToProcess = files.slice(0, availableSlots);
      if (files.length > availableSlots) {
        onError(
          `Only ${availableSlots} image${availableSlots === 1 ? '' : 's'} could be attached (limit: ${maxImages}).`
        );
      }

      const processed: ProcessedImage[] = [];
      for (const file of filesToProcess) {
        const validationError = validateImageFile(file);
        if (validationError) {
          onError(validationError);
          continue;
        }
        try {
          processed.push(await processImageFile(file));
        } catch {
          onError(`Could not process "${file.name}".`);
        }
      }

      if (processed.length > 0) {
        onImagesAttached(processed);
      }
    },
    [supportsVision, isAttachDisabled, attachedCount, maxImages, onImagesAttached, onError]
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

      const imageItems = Array.from(e.clipboardData.items).filter(
        (item) => item.kind === 'file' && item.type.startsWith('image/')
      );

      if (imageItems.length === 0) return;

      // Prevent default paste of image binary text when images are detected
      e.preventDefault();

      const imageFiles = imageItems
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      await handleFiles(imageFiles);
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
