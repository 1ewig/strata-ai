'use client';

import { useSyncExternalStore } from 'react';

/** No-op subscription: the store value only ever flips once, during hydration. */
const emptySubscribe = () => () => {};

/**
 * Returns whether React has hydrated on the client.
 * Renders `false` on the server and during the first client render,
 * then flips to `true` once hydration completes.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}