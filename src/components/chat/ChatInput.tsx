import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, AlertCircle, Square } from 'lucide-react';
import { MAX_MESSAGE_CHARS } from '@/lib/limits';
import ModelSelectorMenu from './ModelSelectorMenu';

/** Props for the ChatInput composer. */
interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onStop?: () => void;
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
  isContextWindowExhausted?: boolean;
}

/** Rotating placeholder prompts for the chat input. */
const ROTATING_PLACEHOLDERS = [
  "How can Strata help?",
  "What are you working on?",
  "Research, write, or build...",
  "Draft, edit, or search...",
  "Ask, plan, or create...",
];

/**
 * Renders the message composer: auto-growing textarea, model/thinking-level
 * selector, and send button with floating island aesthetics.
 */
export default React.memo(function ChatInput({
  onSendMessage,
  onStop,
  isLoading,
  model,
  thinkingLevel,
  onModelSelect,
  onThinkingLevelChange,
  rateLimitData: rateLimitDataProp,
  isContextWindowExhausted = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Rotate placeholders every 3.5s when the input is empty
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Coerce the optional quota payload to null so all downstream checks can be null-based.
  const rateLimitData = rateLimitDataProp ?? null;
  // Sending is blocked once either the 5-hour or weekly quota is exhausted.
  const isQuotaExhausted = rateLimitData !== null && (rateLimitData.remaining5h <= 0 || rateLimitData.remainingWeek <= 0);
  // Sending is also blocked once cumulative usage crosses the model's context window.
  const isBlocked = isQuotaExhausted || isContextWindowExhausted;

  /** Keeps the input state in sync with the textarea value. */
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
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

  /**
   * Validates the trimmed input against the loading/quota/limit guards,
   * submits the message, and clears the composer on success.
   */
  const handleSend = () => {
    const text = inputValue.trim();
    if (text && !isLoading && !isBlocked && !isCharOverLimit) {
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
        if (isLoading && onStop) {
          onStop();
        } else {
          handleSend();
        }
      }}
      className="relative z-10 w-full"
    >
      <div
        className={`flex flex-col gap-2.5 bg-surface-raised/95 dark:bg-surface-raised/90 backdrop-blur-xl border ${isBlocked
            ? 'border-danger/40 bg-danger-soft/20'
            : 'border-edge-raised hover:border-edge-hover focus-within:border-primary/60 focus-within:shadow-glow-primary/20'
          } rounded-2xl md:rounded-3xl p-3 sm:p-4 transition-all shadow-card`}
      >
        {/* Row 1: Text Field Input or Blocking Warning directly on the input field */}
        {isBlocked ? (
          <div className="w-full min-h-[28px] py-1 flex items-center gap-2 text-danger text-label font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
            <span>
              {isContextWindowExhausted
                ? 'Context window reached. Start a new chat to continue.'
                : rateLimitData?.remaining5h === 0
                  ? '5-hour limit reached (10/10 msgs used).'
                  : 'Weekly limit reached (50/50 msgs used).'}
              {!isContextWindowExhausted && rateLimitData?.retryAfter
                ? ` Resets in ~${Math.ceil(rateLimitData.retryAfter / 60)} min.`
                : !isContextWindowExhausted
                  ? ' Please wait before sending.'
                  : ''}
            </span>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            id="chat-input-field"
            rows={1}
            disabled={isLoading}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder={ROTATING_PLACEHOLDERS[placeholderIndex]}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-text-primary placeholder-text-muted border-none text-label sm:text-body focus:outline-none resize-none min-h-[28px] max-h-48 py-1 focus:ring-0 disabled:opacity-50"
          />
        )}

        {/* Row 2: Bottom Toolbar */}
        <div className="flex items-center justify-end pt-1 gap-2">
          {/* Right Side: Model Dropdown, Send / Stop Button */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <ModelSelectorMenu
              model={model}
              thinkingLevel={thinkingLevel}
              onModelSelect={onModelSelect}
              onThinkingLevelChange={onThinkingLevelChange}
            />

            {isLoading ? (
              <button
                id="chat-stop-btn"
                type="button"
                onClick={onStop}
                className="p-2 sm:px-3.5 sm:py-2 rounded-xl shrink-0 transition-colors focus:outline-none bg-danger hover:bg-danger/90 cursor-pointer text-surface border border-transparent animate-in fade-in flex items-center gap-1.5"
                title="Stop generating"
              >
                <Square className="w-3.5 h-3.5 fill-surface text-surface" />
                <span className="hidden sm:inline text-caption font-bold">Stop</span>
              </button>
            ) : (
              <button
                id="chat-submit-btn"
                type="submit"
                disabled={!inputValue.trim() || isBlocked || isCharOverLimit}
                className={`p-2 sm:px-3.5 sm:py-2 rounded-xl shrink-0 transition-colors focus:outline-none flex items-center gap-1.5 border ${
                  !inputValue.trim() || isBlocked || isCharOverLimit
                    ? 'bg-surface-elevated text-text-muted cursor-not-allowed border-edge-raised'
                    : 'bg-primary hover:bg-primary-hover text-surface border-transparent cursor-pointer'
                }`}
                title={
                  isContextWindowExhausted
                    ? 'Context window reached'
                    : isQuotaExhausted
                      ? 'Quota limit reached'
                      : isCharOverLimit
                        ? `Message exceeds ${MAX_MESSAGE_CHARS.toLocaleString()} characters`
                        : !inputValue.trim()
                          ? 'Type a message to send'
                          : 'Send message'
                }
              >
                <span className="hidden sm:inline text-caption font-bold">Send</span>
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
});