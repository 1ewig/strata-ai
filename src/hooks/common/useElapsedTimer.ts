'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * Reusable hook managing elapsed active execution time with 1-second intervals.
 *
 * @param isActive - Whether the timer is currently actively running (e.g. streaming/thinking).
 * @param estimatedSeconds - Optional historical or estimated fallback duration.
 * @returns { elapsedSeconds, displaySeconds }
 */
export function useElapsedTimer(isActive: boolean, estimatedSeconds?: number) {
  const [elapsedSeconds, setElapsedSeconds] = useState(1);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) return;

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const seconds = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
        setElapsedSeconds(seconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const displaySeconds = isActive
    ? elapsedSeconds
    : estimatedSeconds !== undefined
      ? Math.max(elapsedSeconds, estimatedSeconds)
      : elapsedSeconds;

  return {
    elapsedSeconds,
    displaySeconds,
  };
}
