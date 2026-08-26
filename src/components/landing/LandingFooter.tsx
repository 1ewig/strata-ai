'use client';

import React from 'react';
import Link from 'next/link';
import { StrataIcon } from '@/components/ui/strata-icon';

/**
 * Minimalist, Swiss-style footer for the Strata AI landing page.
 */
export function LandingFooter() {
  return (
    <footer className="border-t border-edge-default bg-surface-base py-12 px-4 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        {/* Brand & copyright */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <StrataIcon className="w-4 h-4" />
            <span className="font-display font-extrabold text-label text-text-bright tracking-tight">
              strata<span className="text-micro align-super font-mono opacity-80">®</span>
            </span>
          </div>
          <span className="text-micro font-mono text-text-muted">
            © 2026 Strata AI Studio · All rights reserved.
          </span>
        </div>

        {/* Anchor Links */}
        <div className="flex flex-wrap items-center gap-6 text-caption font-medium text-text-secondary">
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
        <div className="text-micro font-mono text-text-muted flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-olive animate-pulse" />
          <span>Local-first & private</span>
        </div>
      </div>
    </footer>
  );
}
