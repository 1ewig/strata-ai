'use client';

import React, { createContext, useContext, useCallback, useRef, useMemo } from 'react';

/** Imperative callback registered by the chat input to receive injected prompts. */
type PromptTarget = (text: string) => void;

/** Shape of the chat input context consumed by suggestion chips and the input. */
interface ChatInputContextType {
  /** Injects prompt text into the active chat input and focuses it. */
  insertPrompt: (text: string) => void;
  /** Registers the chat input as the prompt target; pass null on unmount. */
  registerPromptTarget: (target: PromptTarget | null) => void;
}

/** The context itself, undefined until a provider mounts so consumers can detect missing scope. */
const ChatInputContext = createContext<ChatInputContextType | undefined>(undefined);

/**
 * Bridges cross-component prompt injection (empty-state suggestion chips) into
 * the chat input without prop drilling or window events. Kept imperative via
 * a ref so injecting a prompt never triggers a re-render of siblings.
 */
export function ChatInputProvider({ children }: { children: React.ReactNode }) {
  const targetRef = useRef<PromptTarget | null>(null);

  const registerPromptTarget = useCallback((target: PromptTarget | null) => {
    targetRef.current = target;
  }, []);

  const insertPrompt = useCallback((text: string) => {
    targetRef.current?.(text);
  }, []);

  const value = useMemo<ChatInputContextType>(
    () => ({ insertPrompt, registerPromptTarget }),
    [insertPrompt, registerPromptTarget],
  );

  return <ChatInputContext.Provider value={value}>{children}</ChatInputContext.Provider>;
}

/**
 * Reads the chat input context.
 * @returns The prompt injection helpers.
 * @throws If called outside a ChatInputProvider.
 */
export function useChatInput() {
  const context = useContext(ChatInputContext);
  if (!context) {
    throw new Error('useChatInput must be used within a ChatInputProvider');
  }
  return context;
}
