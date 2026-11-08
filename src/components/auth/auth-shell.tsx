"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Sun, Moon, Shield, ArrowLeft } from "lucide-react";
import { StrataIcon } from "@/components/ui/strata-icon";
import { useTheme } from "@/hooks/common/useTheme";

/**
 * Props for the shared auth page shell.
 */
interface AuthShellProps {
  /** Content rendered inside the card, typically the Google sign-in button and status. */
  children: ReactNode;
  /** Optional mode for backward compatibility with existing links. */
  mode?: "signin" | "signup";
  /** Destination to return to after successful authentication. */
  callbackUrl?: string;
}

/**
 * Truly minimalist, calm, and human authentication shell.
 * Features a warm studio canvas, centered focused card with tactile elevation,
 * smooth theme switching, and quiet local-first reassurance.
 */
export function AuthShell({ children }: AuthShellProps) {
  const { isDark, toggle: toggleTheme } = useTheme();

  return (
    <div className="min-h-dvh bg-surface-base flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden selection:bg-primary-soft-strong">
      {/* Top Floating Minimalist Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4 z-20">
        {/* Brand link to landing */}
        <Link
          href="/"
          className="flex items-center gap-2 group text-text-bright hover:opacity-80 transition-opacity"
        >
          <StrataIcon className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
          <span className="font-display font-extrabold text-label tracking-tight text-text-bright">
            strata<span className="text-micro align-super font-mono text-text-muted">®</span>
          </span>
        </Link>

        {/* Right Nav: Back to home link and Theme toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium text-text-secondary hover:text-text-bright transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>

          {/* Theme Switcher Button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="p-2 rounded-full text-text-muted hover:text-text-primary bg-surface-raised dark:bg-surface-elevated border border-edge-raised shadow-button transition-colors cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-secondary" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-text-muted" />
            )}
          </motion.button>
        </div>
      </header>

      {/* Main Centered Minimalist Auth Card */}
      <main className="w-full max-w-md mx-auto my-auto py-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="p-7 sm:p-9 rounded-3xl bg-surface-raised dark:bg-surface-elevated border border-edge-raised shadow-card space-y-6"
        >
          {/* Header Icon & Title */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary-soft border border-primary/20 flex items-center justify-center mx-auto mb-3 shadow-button">
              <StrataIcon className="w-6 h-6" />
            </div>

            <h1 className="font-display font-extrabold text-title sm:text-heading text-text-bright tracking-tight">
              Welcome to Strata.
            </h1>

            <p className="text-label text-text-secondary font-sans leading-relaxed">
              Sign in with your Google account to enter your studio workspace.
            </p>
          </div>

          {/* Form Content */}
          {children}

          {/* Quiet Reassurance Note */}
          <div className="pt-2 text-center border-t border-edge-default">
            <p className="text-caption text-text-muted font-sans flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-accent-olive" />
              <span>Local-first · Your files stay private on your device</span>
            </p>
          </div>
        </motion.div>
      </main>

      {/* Minimalist Bottom Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 flex items-center justify-between text-micro font-mono text-text-muted uppercase tracking-widest z-10">
        <div className="flex items-center gap-2">
          <span>strata®</span>
          <span className="text-text-faint">·</span>
          <span>EST. 2026</span>
        </div>
        <div className="text-right text-text-faint font-sans normal-case text-caption">
          A quiet writing studio
        </div>
      </footer>
    </div>
  );
}
