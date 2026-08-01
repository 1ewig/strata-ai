'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, AlertCircle } from 'lucide-react';
import { MAX_MESSAGE_CHARS } from '@/lib/limits';
import ModelSelectorMenu from './ModelSelectorMenu';
import RateLimitRing from './RateLimitRing';

/** Props for the ChatInput composer. */
interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  model: string;
  thinkingLevel: string;
  onModelSelect: (modelId: string) => void;
  onThinkingLevelChange: (level: string) => void;
  rateLimitData?: {
    remaining5h: number;
    remainingWeek: number;
    retryAfter?: number;
  } | null;
}

/**
 * Renders the message composer: auto-growing textarea, model/thinking-level
 * selector, quota ring, and send button. Sending is blocked while streaming,
 * when over the character cap, or when a quota is exhausted.
 *
 * @param onSendMessage - Fires with the trimmed text when the user submits.
 * @param isLoading - Disables the textarea and send button while streaming.
 * @param model - Currently selected model id.
 * @param thinkingLevel - Currently selected thinking effort level.
 * @param onModelSelect - Called when the user picks a model.
 * @param onThinkingLevelChange - Called when the user changes thinking effort.
 * @param rateLimitData - Remaining 5-hour/weekly message quota and optional retry window.
 */
export default function ChatInput({
  onSendMessage,
  isLoading,
  model,
  thinkingLevel,
  onModelSelect,
  onThinkingLevelChange,
  rateLimitData: rateLimitDataProp,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');

  // Coerce the optional quota payload to null so all downstream checks can be null-based.
  const rateLimitData = rateLimitDataProp ?? null;
  // Sending is blocked once either the 5-hour or weekly quota is exhausted.
  const isQuotaExhausted = rateLimitData !== null && (rateLimitData.remaining5h <= 0 || rateLimitData.remainingWeek <= 0);

  /** Keeps the input state in sync with the textarea value. */
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

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

  /**
   * Validates the trimmed input against the loading/quota/limit guards,
   * submits the message, and clears the composer on success.
   */
  const handleSend = () => {
    const text = inputValue.trim();
    if (text && !isLoading && !isQuotaExhausted && !isCharOverLimit) {
      onSendMessage(text);
      setInputValue('');
    }
  };

  /** Enter submits the message; Shift+Enter inserts a newline instead. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className="relative z-10"
    >
      <div className={`flex flex-col gap-2 bg-surface-raised border ${
        isQuotaExhausted ? 'border-danger/40 bg-danger-soft/20' : 'border-edge-hover/60 focus-within:border-edge-hover'
      } rounded-2xl p-3.5 transition-all shadow-lg`}>

        {/* Row 1: Text Field Input or Quota Warning directly on the input field */}
        {isQuotaExhausted ? (
          <div className="w-full min-h-[48px] py-1 flex items-center gap-2 text-danger text-sm font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
            <span>
              {rateLimitData?.remaining5h === 0
                ? '5-hour limit reached (10/10 msgs used).'
                : 'Weekly limit reached (50/50 msgs used).'}
              {rateLimitData?.retryAfter
                ? ` Resets in ~${Math.ceil(rateLimitData.retryAfter / 60)} min.`
                : ' Please wait before sending.'}
            </span>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            id="chat-input-field"
            rows={2}
            disabled={isLoading}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder="Message Strata AI..."
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-text-primary placeholder-text-muted border-none text-sm focus:outline-none resize-none min-h-[48px] max-h-48 py-1 focus:ring-0 disabled:opacity-50"
          />
        )}

        {/* Row 2: Bottom Toolbar (Model Dropdown & Quota Ring on Left, Send Button on Right) */}
        <div className="flex items-center justify-between pt-1">

          {/* Left Side Controls: Model Dropdown & Quota Ring */}
          <div className="flex items-center gap-2">
            <ModelSelectorMenu
              model={model}
              thinkingLevel={thinkingLevel}
              onModelSelect={onModelSelect}
              onThinkingLevelChange={onThinkingLevelChange}
            />

            <RateLimitRing
              rateLimitData={rateLimitData}
              isQuotaExhausted={isQuotaExhausted}
            />
          </div>

          {/* Right Side Controls: Send Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="chat-submit-btn"
              type="submit"
              disabled={isLoading || !inputValue.trim() || isQuotaExhausted || isCharOverLimit}
              className={`p-2 rounded-xl shrink-0 transition-all focus:outline-none ${
                isLoading || !inputValue.trim() || isQuotaExhausted || isCharOverLimit
                  ? 'bg-surface-elevated opacity-40 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-hover cursor-pointer shadow-button'
              }`}
              title={
                isQuotaExhausted
                  ? 'Quota limit reached'
                  : isCharOverLimit
                  ? `Message exceeds ${MAX_MESSAGE_CHARS.toLocaleString()} characters`
                  : !inputValue.trim()
                  ? 'Type a message to send'
                  : 'Send message'
              }
            >
              <ArrowUp className="w-4 h-4 text-surface" />
            </button>
          </div>
        </div>

      </div>
    </form>
  );
}