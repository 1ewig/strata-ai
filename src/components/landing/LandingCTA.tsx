'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, CornerDownLeft } from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';
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
    <section className="py-20 sm:py-28 border-t border-edge-default relative overflow-hidden">
      {/* Subtle Studio Ambient Background Light */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center">
        <div className="w-[500px] h-[300px] rounded-full bg-gradient-to-tr from-primary/10 via-secondary/10 to-transparent blur-3xl opacity-60" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="flex flex-col items-center space-y-6"
        >
          {/* Glowing Brand Mark */}
          <motion.div variants={fadeUpVariants} className="relative group">
            <StrataIcon className="w-14 h-14 transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute -inset-2 rounded-full bg-primary/20 blur-md -z-10 animate-pulse" />
          </motion.div>

          <motion.div variants={fadeUpVariants} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated border border-edge-raised text-micro font-mono uppercase tracking-widest text-text-secondary">
            <span>+ 05 / The Invitation</span>
          </motion.div>

          <motion.h2
            variants={fadeUpVariants}
            className="text-display sm:text-[2.75rem] font-bold text-text-bright font-display tracking-tight max-w-xl"
          >
            Pull up a chair to the studio desk.
          </motion.h2>

          <motion.p
            variants={fadeUpVariants}
            className="text-body text-text-secondary max-w-lg leading-relaxed font-sans"
          >
            Begin with an empty workspace or paste an existing markdown document. No credit card required.
          </motion.p>

          <motion.div
            variants={fadeUpVariants}
            className="flex flex-col sm:flex-row items-center gap-3 pt-4 w-full sm:w-auto"
          >
            <motion.button
              type="button"
              onClick={onOpenStudio}
              {...buttonHoverProps}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-primary hover:bg-primary-hover active:scale-[0.98] text-surface font-semibold text-label shadow-button flex items-center justify-center gap-2 transition-colors cursor-pointer group"
            >
              <span>{userId ? 'Return to Workspace' : 'Open the Studio'}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </motion.button>

            {!userId && (
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-edge-raised hover:border-edge-hover bg-surface-raised/80 dark:bg-surface-elevated/80 hover:bg-surface-hover text-text-primary font-semibold text-label shadow-button transition-colors text-center"
              >
                Create Account
              </Link>
            )}
          </motion.div>

          <motion.div variants={fadeUpVariants} className="pt-2 flex items-center gap-2 text-micro font-mono text-text-muted">
            <CornerDownLeft className="w-3.5 h-3.5 text-text-muted" />
            <span>Instant local-first session in your browser</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
