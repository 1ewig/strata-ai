'use client';

import React from 'react';
import { ArrowUp, Folder, Paperclip, Square } from 'lucide-react';

/** Props for the composer bottom toolbar (attach, drawer, send/stop). */
interface ComposerToolbarProps {
  isAttachDisabled: boolean;
  supportsVision: boolean;
  isImageCapReached: boolean;
  attachedCount: number;
  maxImages: number;
  onAttachClick: () => void;
  filesCount?: number;
  onOpenDrawer?: () => void;
  isLoading: boolean;
  isCompacting: boolean;
  onStop?: () => void;
  hasContent: boolean;
  isBlocked: boolean;
  isCharOverLimit: boolean;
  isQuotaExhausted: boolean;
  isContextWindowExhausted: boolean;
  charLimit: number;
}

/**
 * Row 2 of the composer: the image attach button (with tooltip chain and
 * pending-count badge), the workspace files drawer button, and the
 * send/stop button with its full disabled-state and title logic.
 */
function ComposerToolbar({
  isAttachDisabled,
  supportsVision,
  isImageCapReached,
  attachedCount,
  maxImages,
  onAttachClick,
  filesCount = 0,
  onOpenDrawer,
  isLoading,
  isCompacting,
  onStop,
  hasContent,
  isBlocked,
  isCharOverLimit,
  isQuotaExhausted,
  isContextWindowExhausted,
  charLimit,
}: ComposerToolbarProps) {
  const sendDisabled = !hasContent || isBlocked || isCharOverLimit;

  return (
    <div className="flex items-center justify-between pt-1 gap-2">
      {/* Left Side: Image Attach Button & Files Drawer Button */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Attach Button */}
        <button
          id="chat-attach-btn"
          type="button"
          onClick={onAttachClick}
          disabled={isAttachDisabled}
          className={`group p-2 sm:px-3 sm:py-2 rounded-xl shrink-0 transition-all duration-150 focus:outline-none flex items-center gap-1.5 border shadow-button ${isAttachDisabled
              ? 'bg-surface-elevated text-text-muted cursor-not-allowed border-edge-raised shadow-none'
              : 'bg-surface-raised text-text-primary hover:text-primary hover:border-primary/60 active:scale-95 cursor-pointer border-edge-raised'
            }`}
          title={
            !supportsVision
              ? 'The selected model does not support images'
              : isCompacting
                ? 'Context compaction in progress'
                : isLoading
                  ? 'Wait for the current response'
                  : isBlocked
                    ? 'Quota or context limit reached'
                    : isImageCapReached
                      ? `Up to ${maxImages} images per message`
                      : 'Attach images'
          }
          aria-label="Attach images"
        >
          <Paperclip className="w-4 h-4 transition-transform duration-150 group-hover:scale-110" />
          <span className="hidden sm:inline text-caption font-semibold">Attach image</span>
          {attachedCount > 0 && (
            <span className="text-caption font-bold text-primary">
              {attachedCount}/{maxImages}
            </span>
          )}
        </button>

        {/* Files Drawer Button (Mobile view only) */}
        {onOpenDrawer && (
          <button
            id="chat-files-btn"
            type="button"
            onClick={onOpenDrawer}
            className="sm:hidden group p-2 rounded-xl shrink-0 transition-all duration-150 focus:outline-none flex items-center justify-center border shadow-button bg-surface-raised/80 hover:bg-surface-hover text-text-primary hover:text-primary hover:border-edge-hover active:scale-95 cursor-pointer border-edge-raised"
            title={`Open Workspace Files Drawer (${filesCount} ${filesCount === 1 ? 'file' : 'files'})`}
            aria-label="Open Workspace Files Drawer"
          >
            <Folder className="w-4 h-4 text-text-muted group-hover:text-primary transition-transform duration-150 group-hover:scale-110" />
          </button>
        )}
      </div>

      {/* Right Side: Send / Stop Button */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {isLoading && !isCompacting ? (
          <button
            id="chat-stop-btn"
            type="button"
            onClick={onStop}
            className="group p-2 sm:px-3.5 sm:py-2 rounded-xl shrink-0 transition-all duration-150 focus:outline-none bg-danger hover:bg-danger/90 active:scale-95 cursor-pointer text-surface border border-transparent animate-in fade-in flex items-center gap-1.5 shadow-button"
            title="Stop generating"
          >
            <Square className="w-3.5 h-3.5 fill-surface text-surface group-hover:scale-90 transition-transform duration-150" />
            <span className="hidden sm:inline text-caption font-bold">Stop</span>
          </button>
        ) : (
          <button
            id="chat-submit-btn"
            type="submit"
            disabled={sendDisabled}
            className={`group p-2 sm:px-3.5 sm:py-2 rounded-xl shrink-0 transition-all duration-150 focus:outline-none flex items-center gap-1.5 border shadow-button ${sendDisabled
                ? 'bg-surface-elevated text-text-muted cursor-not-allowed border-edge-raised shadow-none'
                : 'bg-primary hover:bg-primary-hover active:scale-95 text-surface border-transparent cursor-pointer'
              }`}
            title={
              isCompacting
                ? 'Context compaction in progress'
                : isContextWindowExhausted
                  ? 'Context window reached'
                  : isQuotaExhausted
                    ? 'Quota limit reached'
                    : isCharOverLimit
                      ? `Message exceeds ${charLimit.toLocaleString()} characters`
                      : !hasContent
                        ? 'Type a message or attach images to send'
                        : 'Send message'
            }
          >
            <span className="hidden sm:inline text-caption font-bold">Send</span>
            <ArrowUp className="w-3.5 h-3.5 transition-transform duration-150 group-hover:-translate-y-0.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default React.memo(ComposerToolbar);