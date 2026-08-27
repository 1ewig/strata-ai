'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  buttonHoverProps,
  viewportOnce,
} from '@/components/landing/animations';

interface LandingCTAProps {
  userId?: string;
  onOpenStudio: () => void;
}

export function LandingCTA({ userId, onOpenStudio }: LandingCTAProps) {
  return (
    <section className="py-24 sm:py-36 border-t border-edge-default relative px-4 sm:px-8 lg:px-12 bg-surface-raised/40 dark:bg-surface-elevated/30">
      <div className="max-w-7xl mx-auto w-full">
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="space-y-10 sm:space-y-12"
        >
          <div className="max-w-4xl space-y-6">
            <motion.h2
              variants={fadeUpVariants}
              className="font-display font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight text-text-bright leading-[0.95] uppercase"
            >
              Pull up a chair <br />
              and start <br />
              creating<span className="text-primary">.</span>
            </motion.h2>

            <motion.p
              variants={fadeUpVariants}
              className="text-body sm:text-subheading text-text-secondary max-w-xl font-sans leading-relaxed"
            >
              Start with a clean page or bring in your existing notes. Everything is saved directly to your browser—private, instant, and completely yours.
            </motion.p>
          </div>

          {/* Action Row */}
          <motion.div
            variants={fadeUpVariants}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4"
          >
            {userId ? (
              <motion.button
                type="button"
                onClick={onOpenStudio}
                {...buttonHoverProps}
                className="px-8 py-4 rounded-full bg-text-bright text-surface-base font-semibold text-label shadow-button flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer group"
              >
                <span>Open the Studio</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </motion.button>
            ) : (
              <>
                <motion.div {...buttonHoverProps}>
                  <Link
                    href="/auth/signin"
                    className="px-8 py-4 rounded-full bg-text-bright text-surface-base font-semibold text-label shadow-button flex items-center gap-2 hover:opacity-90 transition-opacity group inline-block"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 inline-block" />
                  </Link>
                </motion.div>

                <motion.div {...buttonHoverProps}>
                  <Link
                    href="/auth/signup"
                    className="px-7 py-4 rounded-full border border-edge-raised hover:border-edge-hover bg-surface-raised dark:bg-surface-elevated text-text-primary font-semibold text-label shadow-button transition-colors inline-block"
                  >
                    Create Free Account
                  </Link>
                </motion.div>
              </>
            )}
          </motion.div>

          <motion.div
            variants={fadeUpVariants}
            className="pt-6 text-micro font-mono text-text-muted uppercase tracking-widest"
          >
            // Free to explore · No credit card needed · Stays on your device
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
