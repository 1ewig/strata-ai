'use client';

import { useEffect } from 'react';

const SCROLL_IDLE_TIMEOUT_MS = 1000;

/**
 * Hook that listens for scroll and touch movements and adds an `is-scrolling`
 * class to the active scrolling container and document.documentElement.
 * When scrolling becomes idle, the class is cleanly removed.
 *
 * This enables mobile views to hide scrollbars while idle and fade them in
 * only during active scrolling interactions.
 */
export function useActiveScrollbar() {
  useEffect(() => {
    const timeouts = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    let globalTimeout: ReturnType<typeof setTimeout> | null = null;

    const markScrolling = (el: HTMLElement | null) => {
      // Mark global document root so child selectors match
      document.documentElement.classList.add('is-scrolling');
      if (globalTimeout) {
        clearTimeout(globalTimeout);
      }
      globalTimeout = setTimeout(() => {
        document.documentElement.classList.remove('is-scrolling');
        globalTimeout = null;
      }, SCROLL_IDLE_TIMEOUT_MS);

      // Mark specific container
      if (el && el instanceof HTMLElement) {
        el.classList.add('is-scrolling');
        const existing = timeouts.get(el);
        if (existing) {
          clearTimeout(existing);
        }
        const timer = setTimeout(() => {
          el.classList.remove('is-scrolling');
          timeouts.delete(el);
        }, SCROLL_IDLE_TIMEOUT_MS);
        timeouts.set(el, timer);
      }
    };

    const handleEvent = (event: Event) => {
      const target = event.target;
      const el = target instanceof HTMLElement ? target : null;
      markScrolling(el);
    };

    window.addEventListener('scroll', handleEvent, { capture: true, passive: true });
    window.addEventListener('touchmove', handleEvent, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', handleEvent, { capture: true });
      window.removeEventListener('touchmove', handleEvent, { capture: true });
      if (globalTimeout) {
        clearTimeout(globalTimeout);
      }
      document.documentElement.classList.remove('is-scrolling');
      timeouts.forEach((timer, el) => {
        clearTimeout(timer);
        el.classList.remove('is-scrolling');
      });
      timeouts.clear();
    };
  }, []);
}
