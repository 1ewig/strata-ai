'use client';

import { useState, useCallback } from 'react';

/**
 * Return interface for the useAccordionOpenState hook.
 */
export interface UseAccordionOpenStateReturn {
  isOpen: boolean;
  toggleOpen: () => void;
  setIsOpen: (open: boolean) => void;
  resetUserToggle: () => void;
}

/**
 * Manages accordion open/closed state with user overrides taking precedence over default/dynamic states.
 * When userToggled is null, isOpen dynamically mirrors defaultOpen (e.g. streaming status).
 *
 * @param defaultOpen - Dynamic default open state (e.g., whether the accordion is actively streaming).
 */
export function useAccordionOpenState(defaultOpen = false): UseAccordionOpenStateReturn {
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const isOpen = userToggled !== null ? userToggled : defaultOpen;

  const toggleOpen = useCallback(() => {
    setUserToggled((prev) => (prev !== null ? !prev : !defaultOpen));
  }, [defaultOpen]);

  const setIsOpen = useCallback((open: boolean) => {
    setUserToggled(open);
  }, []);

  const resetUserToggle = useCallback(() => {
    setUserToggled(null);
  }, []);

  return {
    isOpen,
    toggleOpen,
    setIsOpen,
    resetUserToggle,
  };
}
