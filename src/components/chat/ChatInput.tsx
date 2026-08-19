import React, { useRef, useEffect, useState } from 'react';
import { MAX_MESSAGE_CHARS, MAX_IMAGES_PER_MESSAGE, buildQuotaError } from '@/lib/limits';
import { getModelSupportsVision } from '@/lib/models';
import {
  processImageFile,
  validateImageFile,
  type ProcessedImage,
} from '@/lib/image-utils';
import AttachmentPreviews from './composer/AttachmentPreviews';
import ComposerStatusRow from './composer/ComposerStatusRow';
import ComposerToolbar from './composer/ComposerToolbar';
import SlashCommandMenu, { SLASH_COMMANDS, SlashCommand } from './composer/SlashCommandMenu';

/** Props for the ChatInput composer. */
interface ChatInputProps {
  chatId?: string;
  onSendMessage: (text: string, images?: ProcessedImage[]) => void;
  onTriggerCompaction?: () => void;
  onStop?: () => void;
  isLoading: boolean;
  isCompacting?: boolean;
  model: string;
  thinkingLevel: string;
  onModelSelect: (modelId: string) => void;
  onThinkingLevelChange: (level: string) => void;
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
 * pending image attachment previews, and the bottom toolbar (attach, model
 * selector, send/stop) with floating island aesthetics.
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
  const [attachError, setAttachError] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(() => getRandomPlaceholderIndex());
  const prevChatIdRef = useRef(chatId);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

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
  const isImageCapReached = attachedImages.length >= MAX_IMAGES_PER_MESSAGE;
  const isAttachDisabled =
    !supportsVision || isLoading || isBlocked || isImageCapReached || isCompacting;

  // Canonical quota-exhausted copy (from buildQuotaError) with a retry hint.
  const blockedQuotaCopy = React.useMemo(() => {
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
  const slashFilter = inputValue.toLowerCase().trim();
  const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().startsWith(slashFilter)
  );

  // Reset selected command index on input changes
  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [inputValue]);

  /** Keeps the input state in sync with the textarea value. */
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  /**
   * Validates and compresses selected image files, appending them to the
   * pending-attachment queue up to the per-message cap. Invalid or oversized
   * files surface an inline error without disturbing existing attachments.
   */
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setAttachError(null);
    const next: ProcessedImage[] = [];
    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setAttachError(validationError);
        continue;
      }
      try {
        next.push(await processImageFile(file));
      } catch {
        setAttachError(`Could not process "${file.name}".`);
      }
    }
    setAttachedImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES_PER_MESSAGE));
  };

  /** Removes a pending attachment by index. */
  const handleRemoveImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
    setAttachError(null);
  };

  /** Opens the hidden file picker when the attach button is enabled. */
  const handleAttachClick = () => {
    if (isAttachDisabled || !fileInputRef.current) return;
    fileInputRef.current.click();
  };

  // Listen for suggestion chip clicks from the empty state
  useEffect(() => {
    const handleInsertPrompt = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setInputValue(customEvent.detail);
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    };
    window.addEventListener('insert-chat-prompt', handleInsertPrompt);
    return () => {
      window.removeEventListener('insert-chat-prompt', handleInsertPrompt);
    };
  }, []);

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

  /** Executes a selected slash command. */
  const executeCommand = (command: SlashCommand) => {
    if (command.id === 'compact') {
      setInputValue('');
      onTriggerCompaction?.();
    }
  };

  /**
   * Validates the trimmed input against the loading/quota/limit guards,
   * submits the message or command, and clears the composer on success.
   * Image-only messages are allowed (text may be empty when images are attached).
   */
  const handleSend = () => {
    const text = inputValue.trim();
    if (text.toLowerCase() === '/compact') {
      setInputValue('');
      onTriggerCompaction?.();
      return;
    }

    const hasImages = attachedImages.length > 0;
    if ((text || hasImages) && !isLoading && !isBlocked && !isCharOverLimit) {
      onSendMessage(text, hasImages ? attachedImages : undefined);
      setInputValue('');
      setAttachedImages([]);
      setAttachError(null);
    }
  };

  /** Enter submits the message or selects the command; Shift+Enter inserts a newline instead. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
  };

  const hasContent = inputValue.trim().length > 0 || attachedImages.length > 0;

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
      className="relative z-10 w-full"
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
        className={`flex flex-col gap-2.5 bg-surface-raised/95 dark:bg-surface-raised/90 backdrop-blur-xl border ${isCompacting
          ? 'border-primary/40 bg-primary-soft/10'
          : isBlocked
            ? 'border-danger/40 bg-danger-soft/20'
            : 'border-edge-raised hover:border-primary/60 focus-within:border-primary/60 focus-within:shadow-glow-primary/20'
          } rounded-2xl md:rounded-3xl p-3 sm:p-4 transition-all shadow-card`}
      >
        {/* Hidden file picker: multi-image selection, surfaced via the attach button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={handleFilesSelected}
        />

        {/* Pending image attachments: removable thumbnails awaiting send */}
        {(attachedImages.length > 0 || attachError) && (
          <AttachmentPreviews
            images={attachedImages}
            error={attachError}
            onRemove={handleRemoveImage}
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
          supportsVision={supportsVision}
          isImageCapReached={isImageCapReached}
          attachedCount={attachedImages.length}
          maxImages={MAX_IMAGES_PER_MESSAGE}
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