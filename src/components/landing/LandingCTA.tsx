'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
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
 * Bottom call-to-action banner inviting users into the studio.
 */
export function LandingCTA({ userId, onOpenStudio }: LandingCTAProps) {
  return (
    <section className="py-16 md:py-24 border-t border-edge-default">
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-4xl mx-auto px-4 sm:px-6"
      >
        <div className="relative rounded-3xl bg-surface-raised border border-edge-raised p-8 sm:p-12 md:p-16 text-center shadow-card-lg overflow-hidden space-y-6">
          {/* Warm background ambient gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/40 via-transparent to-secondary-soft/20 pointer-events-none" />

          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft border border-primary/20 text-primary text-micro font-semibold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Begin Your Session</span>
            </div>

            <h2 className="font-display font-bold text-heading sm:text-title md:text-display text-text-bright tracking-tight">
              Give your ideas room to breathe.
            </h2>

            <p className="text-body text-text-secondary leading-relaxed">
              Step into a calm studio where you can think freely, collaborate naturally,
              and watch your thoughts organize into durable documents.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              {userId ? (
                <motion.button
                  type="button"
                  {...buttonHoverProps}
                  onClick={onOpenStudio}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary transition-all duration-150 cursor-pointer"
                >
                  <span>Open Your Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.div {...buttonHoverProps} className="w-full sm:w-auto">
                  <Link
                    href="/auth/signup"
                    className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary transition-all duration-150"
                  >
                    <span>Start in the Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              )}
            </div>

            <p className="text-micro text-text-muted pt-2">
              Free to use • Local-first privacy • No installation required
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
