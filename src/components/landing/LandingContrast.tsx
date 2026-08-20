'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  cardVariants,
  viewportOnce,
} from './animations';

/**
 * High-clarity, low-cognitive-load contrast between chat interfaces and Strata Studio.
 */
export function LandingContrast() {
  return (
    <section id="contrast" className="py-16 md:py-24 border-t border-edge-default bg-surface-base/50">
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12"
      >
        <motion.div variants={fadeUpVariants} className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-micro font-semibold uppercase tracking-wider text-text-muted">
            The Difference
          </span>
          <h2 className="font-display font-bold text-heading sm:text-title md:text-display text-text-bright tracking-tight">
            Chats disappear. Documents endure.
          </h2>
          <p className="text-body text-text-secondary">
            Why working with living files feels so much calmer than scrolling through chat threads.
          </p>
        </motion.div>

        {/* 2-Column Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: The Chat Feed (Old way) */}
          <motion.div
            variants={cardVariants}
            className="bg-surface-raised/60 border border-edge-default rounded-3xl p-7 space-y-5 text-text-secondary"
          >
            <div className="space-y-1">
              <span className="text-caption font-semibold text-text-muted uppercase tracking-wider">
                The Chat Feed
              </span>
              <h3 className="font-display font-bold text-subheading text-text-primary">
                Disposable & ephemeral
              </h3>
            </div>

            <ul className="space-y-3 text-label">
              <li className="flex items-start gap-3">
                <X className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <span>Your best paragraphs scroll out of sight within minutes.</span>
              </li>
              <li className="flex items-start gap-3">
                <X className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <span>Small edits trigger full rewrites that erase your personal voice.</span>
              </li>
              <li className="flex items-start gap-3">
                <X className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <span>Endless copying and pasting between tabs to assemble work.</span>
              </li>
            </ul>
          </motion.div>

          {/* Right: Strata Studio (The new way) */}
          <motion.div
            variants={cardVariants}
            className="bg-surface-raised border border-edge-raised rounded-3xl p-7 space-y-5 shadow-card relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-soft rounded-bl-full pointer-events-none" />

            <div className="space-y-1 relative z-10">
              <span className="text-caption font-semibold text-primary uppercase tracking-wider">
                Strata Studio
              </span>
              <h3 className="font-display font-bold text-subheading text-text-bright">
                Structured & permanent
              </h3>
            </div>

            <ul className="space-y-3 text-label relative z-10 text-text-primary">
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-accent-olive shrink-0 mt-0.5" />
                <span>Living documents stay open on your desk right beside the conversation.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-accent-olive shrink-0 mt-0.5" />
                <span>Surgical edits refine exact sentences without touching what you love.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-accent-olive shrink-0 mt-0.5" />
                <span>Stored locally in your browser — private, instant, and distraction-free.</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
