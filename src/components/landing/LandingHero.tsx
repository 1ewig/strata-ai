'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Compass } from 'lucide-react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  buttonHoverProps,
} from './animations';

/** Props for the LandingHero component. */
interface LandingHeroProps {
  /** The current user's id if authenticated. */
  userId?: string;
  /** Callback to launch the workspace for authenticated users. */
  onOpenStudio?: () => void;
}

/**
 * Editorial, human hero with low cognitive load and serene typography.
 */
export function LandingHero({ userId, onOpenStudio }: LandingHeroProps) {
  return (
    <section className="relative pt-16 pb-12 md:pt-24 md:pb-16 overflow-hidden">
      {/* Soft warm desk glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-80 bg-primary-soft/60 rounded-full blur-3xl pointer-events-none -z-10" />

      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-7"
      >
        {/* Soft eyebrow badge */}
        <motion.div variants={fadeUpVariants} className="inline-block">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-raised border border-edge-raised text-caption text-text-secondary shadow-button">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>A quiet space to think</span>
          </div>
        </motion.div>

        {/* Calm, confident headline */}
        <motion.div variants={fadeUpVariants} className="space-y-4">
          <h1 className="font-display font-bold text-text-bright text-display sm:text-[44px] md:text-[52px] tracking-tight leading-[1.12]">
            A quiet room to{' '}
            <span className="text-primary relative inline-block">
              think out loud.
            </span>
          </h1>

          <p className="text-text-secondary text-subheading md:text-heading font-normal leading-relaxed max-w-xl mx-auto">
            Speak your mind without worrying about structure. Strata shapes your thoughts
            into real, living documents right beside you.
          </p>
        </motion.div>

        {/* Primary CTA & subtle link */}
        <motion.div
          variants={fadeUpVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
        >
          {userId ? (
            <motion.button
              type="button"
              {...buttonHoverProps}
              onClick={onOpenStudio}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary transition-all cursor-pointer"
            >
              <span>Open Your Studio</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.div {...buttonHoverProps} className="w-full sm:w-auto">
              <Link
                href="/auth/signup"
                className="w-full inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary transition-all"
              >
                <span>Enter the Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}

          <motion.a
            href="#canvas"
            {...buttonHoverProps}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-text-secondary hover:text-text-bright text-label font-medium transition-colors"
          >
            <Compass className="w-4 h-4 text-text-muted" />
            <span>See the living canvas</span>
          </motion.a>
        </motion.div>

        {/* Minimalist reassurance line */}
        <motion.p variants={fadeUpVariants} className="text-caption text-text-muted pt-1">
          Local-first in your browser • No cloud baggage • Private by default
        </motion.p>
      </motion.div>
    </section>
  );
}
