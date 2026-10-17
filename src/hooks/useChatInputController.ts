'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MAX_MESSAGE_CHARS, MAX_ATTACHMENTS_PER_MESSAGE, buildQuotaError } from '@/lib/limits';
import { getModelSupportsVision } from '@/lib/models';
import type { ProcessedImage } from '@/lib/image-utils';
import type { ProcessedDocument } from '@/lib/document-utils';
import { useChatInputFileDrop } from '@/hooks/useChatInputFileDrop';
import { useChatInput } from '@/contexts/ChatInputContext';
import { getRandomPlaceholderIndex, PLACEHOLDER_PROMPTS } from '@/constants/prompts';
import { useSlashCommands } from '@/hooks/useSlashCommands';
import type { SlashCommand } from '@/components/chat/input/SlashCommandMenu';

export interface UseChatInputControllerOptions {
  chatId?: string;
  onSendMessage: (text: string, images?: ProcessedImage[], documents?: ProcessedDocument[]) => void;
  onTriggerCompaction?: () => void;
  isLoading: boolean;
  isCompacting?: boolean;
  model: string;
  rateLimitData?: {
    remaining5h: number;
    remainingWeek: number;
    retryAfter?: number;
  } | null;
  isContextWindowExhausted?: boolean;
}

/**
 * Controller hook for ChatInput. Encapsulates all stateful mechanics:
 * textarea values, auto-resize DOM effect, placeholder rotation, attachment state,
 * quota copy derivation, slash commands, prompt injection, and send submission.
 */
export function useChatInputController({
  chatId,
  onSendMessage,
  onTriggerCompaction,
  isLoading,
  isCompacting = false,
  model,
  rateLimitData: rateLimitDataProp,
  isContextWindowExhausted = false,
}: UseChatInputControllerOptions) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [attachedImages, setAttachedImages] = useState<ProcessedImage[]>([]);
  const [attachedDocuments, setAttachedDocuments] = useState<ProcessedDocument[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(() => getRandomPlaceholderIndex());
  const prevChatIdRef = useRef(chatId);
  const { registerPromptTarget } = useChatInput();

  // Rotate placeholder prompt when switching to a different conversation
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      setPlaceholderIndex((prev) => getRandomPlaceholderIndex(prev));
    }
  }, [chatId]);

  // Coerce rate limit data to null for safe checks
  const rateLimitData = rateLimitDataProp ?? null;
  const isQuotaExhausted = rateLimitData !== null && (rateLimitData.remaining5h <= 0 || rateLimitData.remainingWeek <= 0);
  const isBlocked = isQuotaExhausted || isContextWindowExhausted || isCompacting;

  const supportsVision = getModelSupportsVision(model);
  const totalAttachedCount = attachedImages.length + attachedDocuments.length;
  const isAttachmentCapReached = totalAttachedCount >= MAX_ATTACHMENTS_PER_MESSAGE;
  const isAttachDisabled = isLoading || isBlocked || isAttachmentCapReached || isCompacting;

  // Format canonical quota exhaustion banner message
  const blockedQuotaCopy = useMemo(() => {
    const err = buildQuotaError(
      rateLimitData?.remaining5h ?? 0,
      rateLimitData?.remainingWeek ?? 0,
      rateLimitData?.retryAfter
    );
    if (!err) return '';
    const retryHint = err.retryAfter
      ? ` Resets in ~${Math.ceil(err.retryAfter / 60)} min.`
      : ' Please wait before sending.';
    return `${err.message}${retryHint}`;
  }, [rateLimitData]);

  const triggerCompaction = useCallback(() => {
    setInputValue('');
    setAttachError(null);
    onTriggerCompaction?.();
  }, [onTriggerCompaction]);

  const executeCommand = useCallback(
    (command: SlashCommand) => {
      if (command.id === 'compact') {
        triggerCompaction();
      }
    },
    [triggerCompaction]
  );

  const clearInput = useCallback(() => {
    setInputValue('');
  }, []);

  // Slash commands keyboard navigation and filtering
  const {
    isSlashMenuOpen,
    filteredCommands,
    selectedCommandIndex,
    setSelectedCommandIndex,
    handleKeyDown: handleSlashKeyDown,
  } = useSlashCommands({
    inputValue,
    isLoading,
    isBlocked,
    onExecute: executeCommand,
    onClearInput: clearInput,
  });

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    setSelectedCommandIndex(0);
  }, [setSelectedCommandIndex]);

  const handleImagesAttached = useCallback((newImages: ProcessedImage[]) => {
    setAttachedImages((prev) => [...prev, ...newImages].slice(0, MAX_ATTACHMENTS_PER_MESSAGE));
  }, []);

  const handleDocumentsAttached = useCallback((newDocs: ProcessedDocument[]) => {
    setAttachedDocuments((prev) => [...prev, ...newDocs].slice(0, MAX_ATTACHMENTS_PER_MESSAGE));
  }, []);

  const { isDraggingOver, handleFiles, dragHandlers } = useChatInputFileDrop({
    supportsVision,
    isAttachDisabled,
    attachedCount: totalAttachedCount,
    maxAttachments: MAX_ATTACHMENTS_PER_MESSAGE,
    onImagesAttached: handleImagesAttached,
    onDocumentsAttached: handleDocumentsAttached,
    onError: setAttachError,
  });

  const handleFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (files.length === 0) return;
      void handleFiles(files);
    },
    [handleFiles]
  );

  const handleRemoveImage = useCallback((index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
    setAttachError(null);
  }, []);

  const handleRemoveDocument = useCallback((index: number) => {
    setAttachedDocuments((prev) => prev.filter((_, i) => i !== index));
    setAttachError(null);
  }, []);

  const handleAttachClick = useCallback(() => {
    if (isAttachDisabled || !fileInputRef.current) return;
    fileInputRef.current.click();
  }, [isAttachDisabled]);

  // Suggestion chip prompt injection target
  useEffect(() => {
    registerPromptTarget((text) => {
      setInputValue(text);
      setSelectedCommandIndex(0);
      textareaRef.current?.focus();
    });
    return () => registerPromptTarget(null);
  }, [registerPromptTarget, setSelectedCommandIndex]);

  // Auto-grow textarea up to 160px
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }
  }, [inputValue]);

  const isCharOverLimit = inputValue.length > MAX_MESSAGE_CHARS;
  const hasContent = inputValue.trim().length > 0 || attachedImages.length > 0 || attachedDocuments.length > 0;

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (text.toLowerCase() === '/compact') {
      triggerCompaction();
      return;
    }

    const hasImages = attachedImages.length > 0;
    const hasDocs = attachedDocuments.length > 0;
    if ((text || hasImages || hasDocs) && !isLoading && !isBlocked && !isCharOverLimit) {
      onSendMessage(
        text,
        hasImages ? attachedImages : undefined,
        hasDocs ? attachedDocuments : undefined
      );
      setInputValue('');
      setAttachedImages([]);
      setAttachedDocuments([]);
      setAttachError(null);
    }
  }, [
    inputValue,
    attachedImages,
    attachedDocuments,
    isLoading,
    isBlocked,
    isCharOverLimit,
    onSendMessage,
    triggerCompaction,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const handled = handleSlashKeyDown(e);
      if (handled) return;

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSlashKeyDown, handleSend]
  );

  return {
    textareaRef,
    fileInputRef,
    inputValue,
    placeholder: PLACEHOLDER_PROMPTS[placeholderIndex],
    attachedImages,
    attachedDocuments,
    attachError,
    totalAttachedCount,
    isAttachDisabled,
    isAttachmentCapReached,
    isDraggingOver,
    dragHandlers,
    isBlocked,
    isQuotaExhausted,
    isCharOverLimit,
    hasContent,
    blockedQuotaCopy,
    isSlashMenuOpen,
    filteredCommands,
    selectedCommandIndex,
    setSelectedCommandIndex,
    executeCommand,
    handleInput,
    handleKeyDown,
    handleFilesSelected,
    handleRemoveImage,
    handleRemoveDocument,
    handleAttachClick,
    handleSend,
  };
}
