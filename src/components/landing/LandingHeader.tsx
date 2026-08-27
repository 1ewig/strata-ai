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
 * Centered floating pill navbar inspired by modern Swiss editorial design.
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
    <header className="fixed top-4 sm:top-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center justify-between gap-3 sm:gap-6 px-3.5 sm:px-5 py-2 rounded-full bg-surface-raised/85 dark:bg-surface-elevated/85 backdrop-blur-xl border border-edge-raised shadow-card hover:border-edge-hover transition-all duration-200 max-w-2xl w-full">
        {/* Brand mark & title */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-text-bright hover:opacity-80 transition-opacity shrink-0"
        >
          <StrataIcon className="w-4 h-4" />
          <span className="font-display font-extrabold text-label tracking-tight text-text-bright">
            strata<span className="text-micro align-super font-mono text-text-muted">®</span>
          </span>
        </Link>

        {/* Navigation links (Desktop) */}
        <nav className="hidden md:flex items-center gap-5 text-caption font-medium text-text-secondary">
          <a
            href="#mission"
            className="hover:text-text-bright transition-colors"
          >
            Mission
          </a>
          <a
            href="#numbers"
            className="hover:text-text-bright transition-colors"
          >
            Numbers
          </a>
          <a
            href="#process"
            className="hover:text-text-bright transition-colors"
          >
            Process
          </a>
          <a
            href="#engines"
            className="hover:text-text-bright transition-colors"
          >
            Engines
          </a>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-elevated border border-edge-default transition-colors cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-secondary" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-text-muted" />
            )}
          </motion.button>

          {userId ? (
            <motion.button
              type="button"
              {...buttonHoverProps}
              onClick={handleOpenStudio}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-text-bright text-surface-base dark:text-surface-base hover:opacity-90 text-caption font-semibold shadow-button transition-all cursor-pointer"
            >
              <span>Studio</span>
              <ArrowRight className="w-3 h-3" />
            </motion.button>
          ) : (
            <motion.div {...buttonHoverProps}>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-text-bright text-surface-base hover:opacity-90 text-caption font-semibold shadow-button transition-opacity"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}
