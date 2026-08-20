'use client';

import React from 'react';
import Link from 'next/link';
import { StrataIcon } from '@/components/ui/strata-icon';

/**
 * Minimalist, quiet footer for the Strata AI landing page.
 */
export function LandingFooter() {
  return (
    <footer className="border-t border-edge-default bg-surface-base py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <StrataIcon className="w-5 h-5" />
          <span className="font-display font-semibold text-label text-text-bright">
            Strata Studio
          </span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-caption text-text-secondary">
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
          <Link
            href="/auth/signin"
            className="hover:text-text-bright transition-colors"
          >
            Sign In
          </Link>
          <a
            href="https://github.com/1ewig/strata-ai"
            target="_blank"
            rel="noreferrer"
            className="hover:text-text-bright transition-colors"
          >
            Source
          </a>
        </div>

        {/* Status */}
        <div className="text-micro text-text-muted flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-olive" />
          <span>Local-first & private</span>
        </div>
      </div>
    </footer>
  );
}
