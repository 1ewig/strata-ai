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

/** How long the theme-transition class stays on <html> after a toggle (ms). */
const TRANSITION_MS = 250;
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Applies the dark/light state to <html> inside a short-lived transition
 * window: the `theme-transitioning` class is attached first so every
 * component's colors cross-fade, then the theme flips on the next frame,
 * then the class is removed so component-level transitions resume.
 */
function applyTheme(next: boolean) {
  const root = document.documentElement;
  // Restart the window cleanly if the user toggles rapidly.
  if (transitionTimer) clearTimeout(transitionTimer);
  root.classList.add('theme-transitioning');
  // Force a synchronous style flush so the transition rules are committed
  // BEFORE the color values change — then the flip cross-fades instead of
  // snapping. Doing this synchronously (no rAF) keeps getSnapshot() correct
  // the moment the change event below dispatches.
  void root.offsetHeight;
  root.classList.toggle('dark', next);
  if (next) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
  transitionTimer = setTimeout(() => {
    root.classList.remove('theme-transitioning');
    transitionTimer = null;
  }, TRANSITION_MS);
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
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // ignore storage errors (private mode)
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { isDark, toggle };
}
