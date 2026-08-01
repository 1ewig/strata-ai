'use client';

import { Moon, Sun } from 'lucide-react';

/** Props for the theme toggle button. */
interface ThemeToggleProps {
  /** Whether dark mode is active. */
  isDark: boolean;
  /** Toggles the theme; the parent owns persistence and syncing. */
  onToggle: () => void;
}

/**
 * Button toggling the light/dark theme. Rendering only — the theme state
 * and persistence logic live in the parent via `useTheme`.
 *
 * @param props - Component props.
 */
export default function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="w-full flex items-center justify-center gap-2 bg-surface-overlay hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-edge-raised px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
    >
      {isDark ? <Sun className="w-3.5 h-3.5 text-secondary" /> : <Moon className="w-3.5 h-3.5 text-text-muted" />}
      <span className="hidden lg:inline">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
