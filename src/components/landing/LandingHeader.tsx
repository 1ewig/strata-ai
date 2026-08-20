'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';
import { useTheme } from '@/hooks/useTheme';
import { db } from '@/lib/db/db';
import { generateId } from '@/lib/id';
import { buttonHoverProps } from './animations';

/** Props for the LandingHeader component. */
interface LandingHeaderProps {
  /** The current user's id if authenticated. */
  userId?: string;
  /** Whether the session is currently resolving. */
  isPending?: boolean;
}

/**
 * Top navigation header for the Strata AI landing page.
 * Provides brand identity, section anchors, theme toggle, and session-aware CTA.
 */
export function LandingHeader({ userId, isPending }: LandingHeaderProps) {
  const { isDark, toggle: toggleTheme } = useTheme();
  const router = useRouter();

  const handleOpenStudio = async () => {
    try {
      if (userId) {
        const all = await db.conversations.toArray();
        const userConvs = all
          .filter((c) => !c.userId || c.userId === userId)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        if (userConvs.length > 0) {
          router.push(`/chat-id/${userConvs[0].id}`);
          return;
        }
      }
      const newId = generateId();
      router.push(`/chat-id/${newId}`);
    } catch {
      const fallbackId = generateId();
      router.push(`/chat-id/${fallbackId}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-edge-default bg-surface-base/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand logo & wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-text-bright hover:opacity-90 transition-opacity"
        >
          <StrataIcon className="w-6 h-6" />
          <span className="font-display font-bold text-subheading tracking-tight text-text-bright">
            Strata
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-lg bg-surface-elevated border border-edge-raised text-micro text-text-muted font-medium">
            Studio
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-label text-text-secondary font-medium">
          <a
            href="#flow"
            className="hover:text-text-bright transition-colors duration-150"
          >
            The Flow
          </a>
          <a
            href="#philosophy"
            className="hover:text-text-bright transition-colors duration-150"
          >
            Philosophy
          </a>
          <a
            href="#details"
            className="hover:text-text-bright transition-colors duration-150"
          >
            Details
          </a>
        </nav>

        {/* Right side actions: theme toggle & auth buttons */}
        <div className="flex items-center gap-2.5">
          {/* Subtle theme toggle button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-elevated border border-edge-default transition-colors duration-150 cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-secondary" />
            ) : (
              <Moon className="w-4 h-4 text-text-muted" />
            )}
          </motion.button>

          {/* Dynamic auth / studio CTA */}
          {isPending ? (
            <div className="w-20 h-9 rounded-xl bg-surface-elevated animate-pulse" />
          ) : userId ? (
            <motion.button
              type="button"
              {...buttonHoverProps}
              onClick={handleOpenStudio}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary transition-all duration-150 cursor-pointer"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          ) : (
            <motion.div {...buttonHoverProps}>
              <Link
                href="/auth/signin"
                className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-text-secondary hover:text-text-bright hover:bg-surface-elevated border border-edge-raised text-label font-medium transition-colors"
              >
                Sign In
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}
