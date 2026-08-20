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
}

/**
 * Clean, distraction-free top navigation for the Strata AI landing page.
 */
export function LandingHeader({ userId }: LandingHeaderProps) {
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand mark & title */}
        <Link
          href="/"
          className="flex items-center gap-2 text-text-bright hover:opacity-90 transition-opacity"
        >
          <StrataIcon className="w-5 h-5" />
          <span className="font-display font-bold text-label tracking-tight text-text-bright">
            Strata
          </span>
          <span className="text-micro px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted font-medium border border-edge-default">
            Studio
          </span>
        </Link>

        {/* Minimalist navigation */}
        <nav className="hidden md:flex items-center gap-7 text-label text-text-secondary">
          <a
            href="#canvas"
            className="hover:text-text-bright transition-colors"
          >
            The Canvas
          </a>
          <a
            href="#contrast"
            className="hover:text-text-bright transition-colors"
          >
            The Contrast
          </a>
          <a
            href="#philosophy"
            className="hover:text-text-bright transition-colors"
          >
            Philosophy
          </a>
        </nav>

        {/* Right side actions: theme toggle & auth button */}
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-elevated border border-edge-default transition-colors cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-secondary" />
            ) : (
              <Moon className="w-4 h-4 text-text-muted" />
            )}
          </motion.button>

          {userId ? (
            <motion.button
              type="button"
              {...buttonHoverProps}
              onClick={handleOpenStudio}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary transition-all cursor-pointer"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          ) : (
            <motion.div {...buttonHoverProps}>
              <Link
                href="/auth/signin"
                className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-elevated text-text-primary border border-edge-raised text-label font-medium shadow-button transition-colors"
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
