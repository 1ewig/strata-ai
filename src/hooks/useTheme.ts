'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** localStorage key where the theme preference is persisted. */
const STORAGE_KEY = 'strata-theme';
/** Custom window event broadcast after a theme change so open tabs stay in sync. */
const THEME_EVENT = 'strata-theme-change';

/** Returns whether the `.dark` token set is currently active on <html>. */
function getSnapshot(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/**
 * Subscribes to theme changes, both from the in-app event and from
 * `storage` events fired by other tabs, returning the unsubscribe fn.
 */
function subscribe(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

/**
 * Light/dark theme state: toggles the `.dark` class on <html>, persists the
 * choice to localStorage and broadcasts it so open tabs stay in sync.
 *
 * @returns Whether dark mode is active and a toggle handler.
 */
export function useTheme() {
  // Derive dark state from the DOM class so it reflects changes made from
  // any source; the snapshot defaults to light when document is undefined.
  const isDark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const toggle = useCallback(() => {
    const next = !getSnapshot();
    document.documentElement.classList.toggle('dark', next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // ignore storage errors (private mode)
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { isDark, toggle };
}
