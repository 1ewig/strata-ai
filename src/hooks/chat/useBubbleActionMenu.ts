'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook managing mobile touch tap-focus and action menu open/close states
 * on chat message bubbles with click-outside detection.
 */
export function useBubbleActionMenu() {
  const [activeBubbleKey, setActiveBubbleKey] = useState<string | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeBubbleKey && !openMenuKey) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveBubbleKey(null);
        setOpenMenuKey(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [activeBubbleKey, openMenuKey]);

  const handleBubbleClick = useCallback((e: React.MouseEvent, key: string) => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      !window.matchMedia('(max-width: 640px), (pointer: coarse)').matches
    ) {
      return;
    }

    const target = e.target as HTMLElement;
    if (target.closest('a, button, [role="button"], pre, code')) return;

    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    setActiveBubbleKey((prev) => (prev === key ? null : key));
  }, []);

  return {
    activeBubbleKey,
    openMenuKey,
    setOpenMenuKey,
    containerRef,
    handleBubbleClick,
  };
}
