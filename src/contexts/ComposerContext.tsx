'use client';

import React, { createContext, useContext, useCallback, useRef, useMemo } from 'react';

/** Imperative callback registered by the composer input to receive injected prompts. */
type PromptTarget = (text: string) => void;

/** Shape of the composer context consumed by suggestion chips and the input. */
interface ComposerContextType {
  /** Injects prompt text into the active composer input and focuses it. */
  insertPrompt: (text: string) => void;
  /** Registers the composer input as the prompt target; pass null on unmount. */
  registerPromptTarget: (target: PromptTarget | null) => void;
}

/** The context itself, undefined until a provider mounts so consumers can detect missing scope. */
const ComposerContext = createContext<ComposerContextType | undefined>(undefined);

/**
 * Bridges cross-component prompt injection (empty-state suggestion chips) into
 * the composer input without prop drilling or window events. Kept imperative via
 * a ref so injecting a prompt never triggers a re-render of siblings.
 */
export function ComposerProvider({ children }: { children: React.ReactNode }) {
  const targetRef = useRef<PromptTarget | null>(null);

  const registerPromptTarget = useCallback((target: PromptTarget | null) => {
    targetRef.current = target;
  }, []);

  const insertPrompt = useCallback((text: string) => {
    targetRef.current?.(text);
  }, []);

  const value = useMemo<ComposerContextType>(
    () => ({ insertPrompt, registerPromptTarget }),
    [insertPrompt, registerPromptTarget],
  );

  return <ComposerContext.Provider value={value}>{children}</ComposerContext.Provider>;
}

/**
 * Reads the composer context.
 * @returns The prompt injection helpers.
 * @throws If called outside a ComposerProvider.
 */
export function useComposer() {
  const context = useContext(ComposerContext);
  if (!context) {
    throw new Error('useComposer must be used within a ComposerProvider');
  }
  return context;
}
