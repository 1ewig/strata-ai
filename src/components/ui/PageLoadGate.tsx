'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useHydrated } from '@/hooks/common/useHydrated';

/** Minimum time the loader stays visible, enough to avoid a sub-perceptual flicker. */
const MIN_DISPLAY_MS = 300;
/** Fade-out duration when the gate lifts. */
const FADE_OUT_MS = 300;

/**
 * Full-page refresh gate. Renders the shared atmospheric loader as a fixed
 * overlay above `children` from the very first server paint until the page
 * has hydrated, web fonts are ready, and a minimum display time has elapsed,
 * then fades out to reveal the real content underneath.
 *
 * Mounted in the root layout, which never remounts during client-side
 * navigation — so the gate runs exactly once per full page load (refresh),
 * while route transitions continue to use the App Router `loading.tsx`.
 */
export function PageLoadGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const [isGateOpen, setIsGateOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const openedAt = performance.now();

    const lift = () => {
      if (cancelled) return;
      const remaining = MIN_DISPLAY_MS - (performance.now() - openedAt);
      timeout = setTimeout(() => {
        if (!cancelled) setIsGateOpen(true);
      }, Math.max(remaining, 0));
    };

    if (document.fonts?.ready) {
      void document.fonts.ready.then(lift);
    } else {
      lift();
    }

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [hydrated]);

  return (
    <>
      {children}
      <AnimatePresence>
        {!isGateOpen && (
          <motion.div
            key="page-load-gate"
            className="fixed inset-0 z-[100] bg-surface-base pointer-events-auto"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_OUT_MS / 1000, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            <LoadingScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}