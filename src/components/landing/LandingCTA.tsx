'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Feather, Compass, CheckCircle2 } from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';
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

const STARTER_PROMPTS = [
  { icon: Feather, text: 'Draft an essay or manifesto' },
  { icon: Compass, text: 'Map a system architecture' },
  { icon: Sparkles, text: 'Turn scattered notes into a brief' },
];

/**
 * Atmospheric, tactile closing invitation to step into the studio.
 */
export function LandingCTA({ userId, onOpenStudio }: LandingCTAProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);

  return (
    <section className="py-20 md:py-28 border-t border-edge-default relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-96 bg-primary-soft/50 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-secondary-soft/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8"
      >
        {/* Central glowing brand emblem */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-surface-raised border border-edge-raised flex items-center justify-center shadow-card-lg">
              <StrataIcon className="w-9 h-9" />
            </div>
            <div className="absolute -inset-2 rounded-3xl bg-primary-soft blur-md -z-10 animate-pulse" />
          </div>
        </div>

        {/* Headings */}
        <div className="space-y-3 max-w-xl mx-auto">
          <h2 className="font-display font-bold text-heading sm:text-title md:text-display text-text-bright tracking-tight">
            The desk is clear. The canvas is open.
          </h2>
          <p className="text-body text-text-secondary leading-relaxed">
            Bring your raw thoughts, unorganized notes, or boldest concepts.
            Step into a quiet studio where ideas become finished work.
          </p>
        </div>

        {/* Starter Spark Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
          {STARTER_PROMPTS.map((prompt, idx) => {
            const Icon = prompt.icon;
            const isSelected = selectedPrompt === idx;
            return (
              <button
                key={prompt.text}
                type="button"
                onClick={() => setSelectedPrompt(isSelected ? null : idx)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-caption transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-surface shadow-button font-medium'
                    : 'bg-surface-raised hover:bg-surface-elevated text-text-secondary border border-edge-raised'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-surface' : 'text-primary'}`} />
                <span>{prompt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Main CTA Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {userId ? (
            <motion.button
              type="button"
              {...buttonHoverProps}
              onClick={onOpenStudio}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary transition-all cursor-pointer"
            >
              <span>Open Your Studio</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.div {...buttonHoverProps} className="w-full sm:w-auto">
              <Link
                href="/auth/signup"
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary transition-all"
              >
                <span>Enter the Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}
        </div>

        {/* Reassurances */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-caption text-text-muted">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent-olive" />
            <span>Instant browser storage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent-olive" />
            <span>100% Private by default</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent-olive" />
            <span>No setup required</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
