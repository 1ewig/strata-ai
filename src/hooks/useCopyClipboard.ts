'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook providing clipboard copy functionality with an automatic 2-second reset timer.
 * Supports copying whole text or item-specific IDs for snippet tracking.
 *
 * @param timeoutMs - Duration before copied state resets (defaults to 2000ms).
 */
export function useCopyClipboard(timeoutMs = 2000) {
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const copy = useCallback(
    (text: string, id?: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);

      clearTimer();
      setCopied(true);
      if (id) {
        setCopiedId(id);
      }

      timerRef.current = setTimeout(() => {
        setCopied(false);
        setCopiedId(null);
      }, timeoutMs);
    },
    [clearTimer, timeoutMs]
  );

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    copied,
    copiedId,
    copy,
  };
}
