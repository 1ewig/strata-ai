import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, AlertCircle, Square, Sparkles } from 'lucide-react';
import { MAX_MESSAGE_CHARS, buildQuotaError } from '@/lib/limits';
import ModelSelectorMenu from './ModelSelectorMenu';
import SlashCommandMenu, { SLASH_COMMANDS, SlashCommand } from './SlashCommandMenu';

/** Props for the ChatInput composer. */
interface ChatInputProps {
  chatId?: string;
  onSendMessage: (text: string) => void;
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
 * Renders the message composer: auto-growing textarea, slash command popup,
 * model/thinking-level selector, and send button with floating island aesthetics.
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
  const [inputValue, setInputValue] = useState('');
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
   */
  const handleSend = () => {
    const text = inputValue.trim();
    if (text.toLowerCase() === '/compact') {
      setInputValue('');
      onTriggerCompaction?.();
      return;
    }

    if (text && !isLoading && !isBlocked && !isCharOverLimit) {
      onSendMessage(text);
      setInputValue('');
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
            : 'border-edge-raised hover:border-edge-hover focus-within:border-primary/60 focus-within:shadow-glow-primary/20'
          } rounded-2xl md:rounded-3xl p-3 sm:p-4 transition-all shadow-card`}
      >
        {/* Row 1: Text Field Input, Compacting Notice, or Blocking Warning */}
        {isCompacting ? (
          <div className="w-full min-h-[28px] py-1 flex items-center gap-2 text-primary text-label font-medium animate-in fade-in">
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Compacting conversation context... Please wait.</span>
          </div>
        ) : isBlocked ? (
          <div className="w-full min-h-[28px] py-1 flex items-center gap-2 text-danger text-label font-medium animate-in fade-in flex-wrap">
            <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
            <span>
              {isContextWindowExhausted
                ? 'Context window reached.'
                : blockedQuotaCopy}
            </span>
            {isContextWindowExhausted && onTriggerCompaction && (
              <button
                type="button"
                onClick={onTriggerCompaction}
                disabled={isLoading || isCompacting}
                className="underline hover:no-underline font-semibold cursor-pointer disabled:opacity-50"
                title="Compact conversation history to reclaim context space"
              >
                Compact history
              </button>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            id="chat-input-field"
            rows={1}
            disabled={isLoading}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder={PLACEHOLDER_PROMPTS[placeholderIndex]}
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

            {isLoading && !isCompacting ? (
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
                className={`p-2 sm:px-3.5 sm:py-2 rounded-xl shrink-0 transition-colors focus:outline-none flex items-center gap-1.5 border ${!inputValue.trim() || isBlocked || isCharOverLimit
                    ? 'bg-surface-elevated text-text-muted cursor-not-allowed border-edge-raised'
                    : 'bg-primary hover:bg-primary-hover text-surface border-transparent cursor-pointer'
                  }`}
                title={
                  isCompacting
                    ? 'Context compaction in progress'
                    : isContextWindowExhausted
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