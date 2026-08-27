'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  cardVariants,
  buttonHoverProps,
} from '@/components/landing/animations';

interface LandingHeroProps {
  userId?: string;
  onOpenStudio: () => void;
}

export function LandingHero({ userId, onOpenStudio }: LandingHeroProps) {
  return (
    <section
      id="mission"
      className="relative min-h-[92dvh] pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-8 lg:px-12 flex flex-col justify-between overflow-hidden"
    >
      {/* Giant Ghost Background Watermark */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center select-none overflow-hidden">
        <span className="text-[22vw] font-display font-extrabold text-text-bright/[0.03] dark:text-text-bright/[0.04] tracking-tighter uppercase translate-y-12">
          strata
        </span>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch my-auto">
        {/* Left Column: High-Voltage Signature Accent Card */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-4 flex flex-col justify-between p-7 sm:p-9 rounded-2xl sm:rounded-3xl bg-primary text-surface shadow-card hover:shadow-card-lg transition-shadow duration-300 relative overflow-hidden group"
        >
          {/* Subtle glow highlight inside accent card */}
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-surface/15 blur-2xl pointer-events-none" />

          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <span className="font-display font-extrabold text-subheading tracking-tight text-surface">
                strata<span className="text-micro align-super font-mono opacity-80">®</span>
              </span>
              <span className="text-micro font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface/20 text-surface border border-surface/30">
                WRITING STUDIO
              </span>
            </div>

            <p className="text-label text-surface/90 leading-relaxed font-sans font-medium">
              Most AI chats feel disposable. Strata gives your ideas a real home—where you and AI write, edit, and organize living documents side by side.
            </p>

            <div className="pt-2 border-t border-surface/20">
              <p className="text-label font-bold text-surface">
                From a rough outline to finished work in minutes.
              </p>
            </div>
          </div>

          <div className="pt-10 relative z-10">
            <a
              href="#numbers"
              className="inline-flex items-center gap-1.5 text-caption font-mono uppercase tracking-wider text-surface font-semibold hover:translate-x-1 transition-transform cursor-pointer"
            >
              <span>See how it works</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>

        {/* Right Column: Giant Display Headline & CTA */}
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-8 flex flex-col justify-between pl-0 lg:pl-6"
        >
          <motion.div variants={fadeUpVariants} className="space-y-4">
            <h1 className="font-display font-extrabold text-5xl sm:text-7xl md:text-8xl lg:text-[5.75rem] xl:text-[6.5rem] tracking-tighter text-text-bright leading-[0.92] uppercase">
              Turning <br />
              passing <br />
              ideas into <br />
              real work<span className="text-primary">.</span>
            </h1>
          </motion.div>

          {/* Action Row */}
          <motion.div
            variants={fadeUpVariants}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-10 sm:pt-14"
          >
            <div className="flex items-center gap-4">
              <motion.button
                type="button"
                onClick={onOpenStudio}
                {...buttonHoverProps}
                className="w-14 h-14 rounded-full bg-text-bright text-surface-base flex items-center justify-center shadow-button hover:opacity-90 transition-all cursor-pointer group shrink-0"
                aria-label="Open Studio"
              >
                <ArrowRight className="w-6 h-6 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-rotate-45" />
              </motion.button>
              <button
                type="button"
                onClick={onOpenStudio}
                className="text-label font-bold text-text-bright hover:text-primary transition-colors cursor-pointer text-left"
              >
                {userId ? 'Enter your workspace' : 'Open the Studio'}
              </button>
            </div>

            {!userId && (
              <Link
                href="/auth/signin"
                className="text-caption font-mono uppercase tracking-wider text-text-muted hover:text-text-bright transition-colors"
              >
                // Existing account? Sign in →
              </Link>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Metadata Bar */}
      <div className="max-w-7xl mx-auto w-full flex items-end justify-between gap-6 pt-12 sm:pt-16 text-micro font-mono text-text-muted uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-text-faint">Est.</span> <span className="text-text-primary font-semibold">2026</span>
          </div>
          <span className="text-text-faint">// strata®</span>
        </div>
        <div className="text-right text-text-secondary">
          A quiet studio for deep thinking & writing
        </div>
      </div>
    </section>
  );
}