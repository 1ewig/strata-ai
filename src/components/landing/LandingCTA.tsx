'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import {
  fadeUpVariants,
  buttonHoverProps,
  viewportOnce,
} from './animations';

/** Props for the LandingCTA component. */
interface LandingCTAProps {
  /** The current user's id if authenticated. */
  userId?: string;
  /** Callback to launch the workspace for authenticated users. */
  onOpenStudio?: () => void;
}

/**
 * Serene, inviting closing call to action.
 */
export function LandingCTA({ userId, onOpenStudio }: LandingCTAProps) {
  return (
    <section className="py-16 md:py-24 border-t border-edge-default">
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6"
      >
        <div className="relative rounded-3xl bg-surface-raised border border-edge-raised p-8 sm:p-14 shadow-card-lg overflow-hidden space-y-5">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/30 via-transparent to-secondary-soft/20 pointer-events-none" />

          <div className="relative z-10 space-y-3 max-w-lg mx-auto">
            <h2 className="font-display font-bold text-heading sm:text-title md:text-display text-text-bright tracking-tight">
              Give your ideas room to breathe.
            </h2>
            <p className="text-body text-text-secondary leading-relaxed">
              Open a clean canvas and experience a calmer, more natural way to think and write.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center">
            {userId ? (
              <motion.button
                type="button"
                {...buttonHoverProps}
                onClick={onOpenStudio}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary transition-all cursor-pointer"
              >
                <span>Open Your Studio</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.div {...buttonHoverProps}>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary transition-all"
                >
                  <span>Start in the Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
