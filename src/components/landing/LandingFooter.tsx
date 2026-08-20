'use client';

import React from 'react';
import Link from 'next/link';
import { StrataIcon } from '@/components/ui/strata-icon';

/**
 * Minimal, clean footer for the Strata AI landing page.
 */
export function LandingFooter() {
  return (
    <footer className="border-t border-edge-default bg-surface-base py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & tagline */}
        <div className="flex items-center gap-3">
          <StrataIcon className="w-5 h-5" />
          <div className="flex flex-col">
            <span className="font-display font-bold text-label text-text-bright">Strata AI</span>
            <span className="text-caption text-text-muted">
              Thoughtful document studio & living workspace
            </span>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-caption text-text-secondary">
          <a
            href="#flow"
            className="hover:text-text-bright transition-colors"
          >
            The Flow
          </a>
          <a
            href="#philosophy"
            className="hover:text-text-bright transition-colors"
          >
            Philosophy
          </a>
          <a
            href="#details"
            className="hover:text-text-bright transition-colors"
          >
            Craft
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
        <div className="text-micro text-text-muted flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-olive" />
          <span>Local-first & privacy-first</span>
        </div>
      </div>
    </footer>
  );
}
