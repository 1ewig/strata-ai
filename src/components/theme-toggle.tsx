'use client';

import React, { useCallback, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'strata-theme';
const THEME_EVENT = 'strata-theme-change';

function getSnapshot(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

export default function ThemeToggle() {
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
