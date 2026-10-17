'use client';

import { useEffect, type RefObject } from 'react';

export interface UseClickOutsideOptions {
  triggerRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
}

/**
 * Custom hook to detect clicks/taps outside a target element, with support
 * for an optional trigger ref that should also be ignored.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  options: UseClickOutsideOptions = {}
) {
  const { triggerRef, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (ref.current && !ref.current.contains(target)) {
        if (triggerRef?.current && triggerRef.current.contains(target)) {
          return;
        }
        callback();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, callback, triggerRef, enabled]);
}
