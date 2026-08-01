'use client';

import React, { useCallback, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

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
 * Button toggling the light/dark theme by toggling the `.dark` class on
 * <html>, persisting the choice to localStorage and broadcasting it.
 */
export default function ThemeToggle() {
  // Derive dark state from the DOM class so it reflects changes made from
  // any source; the snapshot defaults to light when document is undefined.
  const isDark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const handleToggle = useCallback(() => {
    const next = !getSnapshot();
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // ignore storage errors (private mode)
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="w-full flex items-center justify-center gap-2 bg-surface-overlay hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-edge-raised px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
    >
      {isDark ? <Sun className="w-3.5 h-3.5 text-secondary" /> : <Moon className="w-3.5 h-3.5 text-text-muted" />}
      <span className="hidden lg:inline">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
