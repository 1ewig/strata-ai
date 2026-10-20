import React from 'react';
import { MAX_MESSAGE_CHARS, MAX_ATTACHMENTS_PER_MESSAGE } from '@/lib/limits';
import type { ProcessedImage } from '@/lib/attachments/images';
import type { ProcessedDocument } from '@/lib/attachments/documents';
import AttachmentPreviews from './AttachmentPreviews';
import InputStatusRow from './InputStatusRow';
import InputToolbar from './InputToolbar';
import DropZoneOverlay from './DropZoneOverlay';
import SlashCommandMenu from './SlashCommandMenu';
import { useChatInputController } from '@/hooks/chat/useChatInputController';

/** Props for the chat input. */
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

/**
 * ChatInput parent component: calls useChatInputController to manage input state,
 * and composes reusable UI blocks (SlashCommandMenu, DropZoneOverlay, AttachmentPreviews,
 * InputStatusRow, and InputToolbar) via clean prop contracts.
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
  rateLimitData,
  isContextWindowExhausted = false,
}: ChatInputProps) {
  const {
    textareaRef,
    fileInputRef,
    inputValue,
    placeholder,
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
  } = useChatInputController({
    chatId,
    onSendMessage,
    onTriggerCompaction,
    isLoading,
    isCompacting,
    model,
    rateLimitData,
    isContextWindowExhausted,
  });

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
      className="relative z-30 w-full"
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
        className={`relative flex flex-col gap-2.5 bg-surface-raised/95 dark:bg-surface-raised/90 backdrop-blur-xl border ${
          isCompacting
            ? 'border-primary/40 bg-primary-soft/10'
            : isBlocked
              ? 'border-danger/40 bg-danger-soft/20'
              : isDraggingOver
                ? 'border-primary shadow-glow-primary/30 ring-2 ring-primary/20'
                : 'border-edge-raised hover:border-primary/60 focus-within:border-primary/60 focus-within:shadow-glow-primary/20'
        } rounded-2xl md:rounded-3xl p-3 sm:p-4 transition-all shadow-card`}
      >
        {/* Floating Drop Zone Overlay */}
        <DropZoneOverlay
          isVisible={isDraggingOver}
          isAttachDisabled={isAttachDisabled}
          disabledReason={
            isAttachmentCapReached
              ? `Maximum of ${MAX_ATTACHMENTS_PER_MESSAGE} attachments reached`
              : 'Attachment unavailable'
          }
        />

        {/* Hidden file picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/*,.md,.markdown,.csv,.tsv,.json,.yaml,.yml,.ts,.js,.jsx,.tsx,.py,.sql,.rs,.go,.html,.css,.sh,.java,.c,.cpp"
          multiple
          hidden
          onChange={handleFilesSelected}
        />

        {/* Pending attachments */}
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
        <InputStatusRow
          isCompacting={isCompacting}
          isBlocked={isBlocked}
          isContextWindowExhausted={isContextWindowExhausted}
          blockedQuotaCopy={blockedQuotaCopy}
          onTriggerCompaction={onTriggerCompaction}
          isLoading={isLoading}
          value={inputValue}
          placeholder={placeholder}
          charLimit={MAX_MESSAGE_CHARS}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRef}
        />

        {/* Row 2: Bottom Toolbar */}
        <InputToolbar
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