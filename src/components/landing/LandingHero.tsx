'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, HardDrive, Compass, FileText } from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';

/** Props for the LandingHero component. */
interface LandingHeroProps {
  /** The current user's id if authenticated. */
  userId?: string;
  /** Callback to launch the workspace for authenticated users. */
  onOpenStudio?: () => void;
}

/**
 * Hero section of the Strata AI landing page.
 * Sets a warm, reflective, and human tone highlighting calm collaboration
 * and durable document creation over ephemeral chat bubbles.
 */
export function LandingHero({ userId, onOpenStudio }: LandingHeroProps) {
  return (
    <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
      {/* Soft background ambient radial glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-primary-soft rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-72 h-72 bg-secondary-soft rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
        {/* Soft studio pill badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-raised border border-edge-raised shadow-button text-caption font-medium text-text-secondary">
          <StrataIcon className="w-4 h-4" />
          <span>A calmer, more natural way to work with AI</span>
        </div>

        {/* Hero headline */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="font-display font-bold text-text-bright text-display sm:text-[42px] md:text-[50px] tracking-tight leading-[1.12]">
            Where messy thoughts become{' '}
            <span className="text-primary relative inline-block">
              finished work.
              <svg
                className="absolute -bottom-2 left-0 w-full h-2 text-primary/30"
                viewBox="0 0 100 8"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M0 6C30 1 70 1 100 6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="text-text-secondary text-subheading md:text-heading font-normal leading-relaxed max-w-2xl mx-auto">
            Most AI tools trap your best thinking in disposable chat feeds that scroll away.
            Strata works beside you as a quiet partner — shaping unorganized notes,
            proposals, and ideas into durable documents on your live canvas.
          </p>
        </div>

        {/* Primary & secondary CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          {userId ? (
            <button
              type="button"
              onClick={onOpenStudio}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <span>Open Your Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary active:scale-95 transition-all duration-150"
            >
              <span>Enter the Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <a
            href="#preview"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-raised hover:bg-surface-elevated text-text-primary border border-edge-raised text-label font-medium shadow-button active:scale-95 transition-all duration-150"
          >
            <Compass className="w-4 h-4 text-text-muted" />
            <span>See how it feels</span>
          </a>
        </div>

        {/* Reassurance pills */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-caption text-text-muted">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-secondary" />
            <span>Local-first in your browser</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-olive" />
            <span>Private and unencumbered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Multi-file tactile canvas</span>
          </div>
        </div>
      </div>
    </section>
  );
}
