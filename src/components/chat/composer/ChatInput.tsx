import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { MAX_MESSAGE_CHARS, MAX_ATTACHMENTS_PER_MESSAGE, buildQuotaError } from '@/lib/limits';
import { getModelSupportsVision } from '@/lib/models';
import { type ProcessedImage } from '@/lib/image-utils';
import { type ProcessedDocument } from '@/lib/document-utils';
import AttachmentPreviews from './AttachmentPreviews';
import ComposerStatusRow from './ComposerStatusRow';
import ComposerToolbar from './ComposerToolbar';
import DropZoneOverlay from './DropZoneOverlay';
import SlashCommandMenu, { SLASH_COMMANDS, SlashCommand } from './SlashCommandMenu';
import { useComposerFileDrop } from '@/hooks/useComposerFileDrop';
import { useComposer } from '@/contexts/ComposerContext';

/** Props for the ChatInput composer. */
interface ChatInputProps {
  chatId?: string;
  onSendMessage: (text: string, images?: ProcessedImage[], documents?: ProcessedDocument[]) => void;
  onTriggerCompaction?: () => void;
  onStop?: () => void;
  isLoading: boolean;
  isCompacting?: boolean;
  model: string;
  thinkingLevel?: string;
  onModelSelect?: (modelId: string) => void;
  onThinkingLevelChange?: (level: string) => void;
  rateLimitData?: {
    remaining5h: number;
    remainingWeek: number;
    retryAfter?: number;
  } | null;
  isContextWindowExhausted?: boolean;
}

/** Available placeholder prompts for the chat input composer. */
export const PLACEHOLDER_PROMPTS = [
  "How can Strata help?",
  "What are you working on?",
  "Research, write, or build...",
  "Draft, edit, or search...",
  "Ask, plan, or create...",
];

/**
 * Selects a random placeholder prompt index, avoiding picking the same prompt
 * consecutively when multiple options are available.
 *
 * @param excludeIndex - Optional index to avoid selecting
 * @returns A randomized index within PLACEHOLDER_PROMPTS
 */
function getRandomPlaceholderIndex(excludeIndex?: number): number {
  if (PLACEHOLDER_PROMPTS.length <= 1) return 0;
  let nextIndex: number;
  do {
    nextIndex = Math.floor(Math.random() * PLACEHOLDER_PROMPTS.length);
  } while (excludeIndex !== undefined && nextIndex === excludeIndex);
  return nextIndex;
}

/**
 * Renders the message composer orchestrator: owns all input state and handlers,
 * and composes the slash command popup, status row (compacting/blocked/textarea),
 * pending image & document attachment previews, and the bottom toolbar (attach,
 * model selector, send/stop) with floating island aesthetics.
 */
export default React.memo(function ChatInput({
  chatId,
  onSendMessage,
  onTriggerCompaction,
  onStop,
  isLoading,
  isCompacting = false,
  model,
  thinkingLevel,
  onModelSelect,
  onThinkingLevelChange,
  rateLimitData: rateLimitDataProp,
  isContextWindowExhausted = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [attachedImages, setAttachedImages] = useState<ProcessedImage[]>([]);
  const [attachedDocuments, setAttachedDocuments] = useState<ProcessedDocument[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(() => getRandomPlaceholderIndex());
  const prevChatIdRef = useRef(chatId);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const { registerPromptTarget } = useComposer();

  // Update placeholder when switching to a different or fresh chat conversation.
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      setPlaceholderIndex((prev) => getRandomPlaceholderIndex(prev));
    }
  }, [chatId]);

  // Coerce the optional quota payload to null so all downstream checks can be null-based.
  const rateLimitData = rateLimitDataProp ?? null;
  // Sending is blocked once either the 5-hour or weekly quota is exhausted.
  const isQuotaExhausted = rateLimitData !== null && (rateLimitData.remaining5h <= 0 || rateLimitData.remainingWeek <= 0);
  // Sending is also blocked once cumulative usage crosses the model's context window or during compaction.
  const isBlocked = isQuotaExhausted || isContextWindowExhausted || isCompacting;

  // The active model must be vision-capable for image attachments.
  const supportsVision = getModelSupportsVision(model);
  const totalAttachedCount = attachedImages.length + attachedDocuments.length;
  const isAttachmentCapReached = totalAttachedCount >= MAX_ATTACHMENTS_PER_MESSAGE;
  const isAttachDisabled =
    isLoading || isBlocked || isAttachmentCapReached || isCompacting;

  // Canonical quota-exhausted copy (from buildQuotaError) with a retry hint.
  const blockedQuotaCopy = useMemo(() => {
    const err = buildQuotaError(
      rateLimitData?.remaining5h ?? 0,
      rateLimitData?.remainingWeek ?? 0,
      rateLimitData?.retryAfter,
    );
    if (!err) return '';
    const retryHint = err.retryAfter
      ? ` Resets in ~${Math.ceil(err.retryAfter / 60)} min.`
      : ' Please wait before sending.';
    return `${err.message}${retryHint}`;
  }, [rateLimitData]);

  // Slash commands menu state
  const isSlashMenuOpen = inputValue.startsWith('/') && !isLoading && !isBlocked;
  const filteredCommands = useMemo(() => {
    const slashFilter = inputValue.toLowerCase().trim();
    return SLASH_COMMANDS.filter((cmd) => cmd.name.toLowerCase().startsWith(slashFilter));
  }, [inputValue]);

  /** Keeps the input state in sync with the textarea value and resets command selection. */
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    setSelectedCommandIndex(0);
  }, []);

  /** Appends newly validated and processed image attachments up to the cap. */
  const handleImagesAttached = useCallback((newImages: ProcessedImage[]) => {
    setAttachedImages((prev) => [...prev, ...newImages].slice(0, MAX_ATTACHMENTS_PER_MESSAGE));
  }, []);

  /** Appends newly validated and processed document attachments up to the cap. */
  const handleDocumentsAttached = useCallback((newDocs: ProcessedDocument[]) => {
    setAttachedDocuments((prev) => [...prev, ...newDocs].slice(0, MAX_ATTACHMENTS_PER_MESSAGE));
  }, []);

  // Drag-and-drop, clipboard paste, and file-picker validation/processing are all
  // funneled through this single hook so the attachment pipeline has one source of truth.
  const { isDraggingOver, handleFiles, dragHandlers } = useComposerFileDrop({
    supportsVision,
    isAttachDisabled,
    attachedCount: totalAttachedCount,
    maxAttachments: MAX_ATTACHMENTS_PER_MESSAGE,
    onImagesAttached: handleImagesAttached,
    onDocumentsAttached: handleDocumentsAttached,
    onError: setAttachError,
  });

  /** Forwards selected files to the shared attachment pipeline. */
  const handleFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (files.length === 0) return;
      void handleFiles(files);
    },
    [handleFiles],
  );

  /** Removes a pending image attachment by index. */
  const handleRemoveImage = useCallback((index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
    setAttachError(null);
  }, []);

  /** Removes a pending document attachment by index. */
  const handleRemoveDocument = useCallback((index: number) => {
    setAttachedDocuments((prev) => prev.filter((_, i) => i !== index));
    setAttachError(null);
  }, []);

  /** Opens the hidden file picker when the attach button is enabled. */
  const handleAttachClick = useCallback(() => {
    if (isAttachDisabled || !fileInputRef.current) return;
    fileInputRef.current.click();
  }, [isAttachDisabled]);

  // Register as the prompt injection target for the empty-state suggestion chips.
  useEffect(() => {
    registerPromptTarget((text) => {
      setInputValue(text);
      setSelectedCommandIndex(0);
      textareaRef.current?.focus();
    });
    return () => registerPromptTarget(null);
  }, [registerPromptTarget]);

  // Auto-grow the textarea up to a 160px cap as the user types.
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }
  }, [inputValue]);

  // Guard flag: input exceeds the hard character cap.
  const isCharOverLimit = inputValue.length > MAX_MESSAGE_CHARS;

  /** Triggers compaction and clears the composer. Shared by the command and send paths. */
  const triggerCompaction = useCallback(() => {
    setInputValue('');
    setAttachError(null);
    onTriggerCompaction?.();
  }, [onTriggerCompaction]);

  /** Executes a selected slash command. */
  const executeCommand = useCallback(
    (command: SlashCommand) => {
      if (command.id === 'compact') {
        triggerCompaction();
      }
    },
    [triggerCompaction],
  );

  /**
   * Validates the trimmed input against the loading/quota/limit guards,
   * submits the message or command, and clears the composer on success.
   * Attachment-only messages are allowed (text may be empty when files are attached).
   */
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
        hasDocs ? attachedDocuments : undefined,
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

  /** Enter submits the message or selects the command; Shift+Enter inserts a newline instead. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isSlashMenuOpen && filteredCommands.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCommandIndex((prev) => (prev + 1) % filteredCommands.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCommandIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          executeCommand(filteredCommands[selectedCommandIndex]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setInputValue('');
          return;
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [isSlashMenuOpen, filteredCommands, selectedCommandIndex, executeCommand, handleSend],
  );

  const hasContent = inputValue.trim().length > 0 || attachedImages.length > 0 || attachedDocuments.length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isLoading && onStop && !isCompacting) {
          onStop();
        } else {
          handleSend();
        }
      }}
      className="relative z-20 w-full"
    >
      {/* Floating Slash Command Menu */}
      <SlashCommandMenu
        isOpen={isSlashMenuOpen}
        commands={filteredCommands}
        selectedIndex={selectedCommandIndex}
        onSelectIndex={setSelectedCommandIndex}
        onExecute={executeCommand}
      />

      <div
        {...dragHandlers}
        className={`relative flex flex-col gap-2.5 bg-surface-raised/95 dark:bg-surface-raised/90 backdrop-blur-xl border ${isCompacting
          ? 'border-primary/40 bg-primary-soft/10'
          : isBlocked
            ? 'border-danger/40 bg-danger-soft/20'
            : isDraggingOver
              ? 'border-primary shadow-glow-primary/30 ring-2 ring-primary/20'
              : 'border-edge-raised hover:border-primary/60 focus-within:border-primary/60 focus-within:shadow-glow-primary/20'
          } rounded-2xl md:rounded-3xl p-3 sm:p-4 transition-all shadow-card`}
      >
        {/* Floating Drop Zone Overlay: illuminated on dragover */}
        <DropZoneOverlay
          isVisible={isDraggingOver}
          isAttachDisabled={isAttachDisabled}
          disabledReason={
            isAttachmentCapReached
              ? `Maximum of ${MAX_ATTACHMENTS_PER_MESSAGE} attachments reached`
              : 'Attachment unavailable'
          }
        />
        {/* Hidden file picker: multi-file selection, surfaced via the attach button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/*,.md,.markdown,.csv,.tsv,.json,.yaml,.yml,.ts,.js,.jsx,.tsx,.py,.sql,.rs,.go,.html,.css,.sh,.java,.c,.cpp"
          multiple
          hidden
          onChange={handleFilesSelected}
        />

        {/* Pending attachments: removable thumbnails and document chips awaiting send */}
        {(attachedImages.length > 0 || attachedDocuments.length > 0 || attachError) && (
          <AttachmentPreviews
            images={attachedImages}
            documents={attachedDocuments}
            error={attachError}
            onRemoveImage={handleRemoveImage}
            onRemoveDocument={handleRemoveDocument}
          />
        )}

        {/* Row 1: Text Field Input, Compacting Notice, or Blocking Warning */}
        <ComposerStatusRow
          isCompacting={isCompacting}
          isBlocked={isBlocked}
          isContextWindowExhausted={isContextWindowExhausted}
          blockedQuotaCopy={blockedQuotaCopy}
          onTriggerCompaction={onTriggerCompaction}
          isLoading={isLoading}
          value={inputValue}
          placeholder={PLACEHOLDER_PROMPTS[placeholderIndex]}
          charLimit={MAX_MESSAGE_CHARS}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRef}
        />

        {/* Row 2: Bottom Toolbar */}
        <ComposerToolbar
          isAttachDisabled={isAttachDisabled}
          isAttachmentCapReached={isAttachmentCapReached}
          attachedCount={totalAttachedCount}
          maxAttachments={MAX_ATTACHMENTS_PER_MESSAGE}
          onAttachClick={handleAttachClick}
          model={model}
          thinkingLevel={thinkingLevel}
          onModelSelect={onModelSelect}
          onThinkingLevelChange={onThinkingLevelChange}
          isLoading={isLoading}
          isCompacting={isCompacting}
          onStop={onStop}
          hasContent={hasContent}
          isBlocked={isBlocked}
          isCharOverLimit={isCharOverLimit}
          isQuotaExhausted={isQuotaExhausted}
          isContextWindowExhausted={isContextWindowExhausted}
          charLimit={MAX_MESSAGE_CHARS}
        />
      </div>
    </form>
  );
});