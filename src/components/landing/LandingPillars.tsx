'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Layers, Feather, ShieldCheck } from 'lucide-react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  cardVariants,
  cardHoverProps,
  viewportOnce,
} from './animations';

const PILLARS = [
  {
    icon: Layers,
    accent: 'text-primary',
    badgeBg: 'bg-primary-soft',
    badgeBorder: 'border-primary/20',
    title: 'Living Documents, Not Disposable Chats',
    description:
      'Endless chat threads are where great thoughts get lost. Strata turns ideas into organized, tactile files that stay open and editable right beside your conversation.',
    highlight: 'No scrolling back 50 bubbles to find a draft.',
  },
  {
    icon: Feather,
    accent: 'text-secondary',
    badgeBg: 'bg-secondary-soft',
    badgeBorder: 'border-secondary/20',
    title: 'Surgical Edits That Respect Your Voice',
    description:
      'Most AI tools erase your individuality by rewriting entire pages. Strata pinpoints exact sentences and sections, refining tone and structure while keeping what you wrote.',
    highlight: 'Precision changes that preserve your style.',
  },
  {
    icon: ShieldCheck,
    accent: 'text-accent-olive',
    badgeBg: 'bg-accent-olive-soft',
    badgeBorder: 'border-accent-olive/20',
    title: 'Local Solitude & Total Privacy',
    description:
      'Your workspace is saved directly in your browser. Fast, distraction-free, and private by default — you can think, write, and explore in uninterrupted focus.',
    highlight: 'Zero cloud lock-in. Your work remains yours.',
  },
];

/**
 * Pillars component highlighting the human-centric design philosophy of Strata AI.
 */
export function LandingPillars() {
  return (
    <section id="philosophy" className="py-16 md:py-24 border-t border-edge-default">
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12"
      >
        <motion.div variants={fadeUpVariants} className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated border border-edge-raised text-micro font-semibold uppercase tracking-wider text-text-muted">
            The Philosophy
          </div>
          <h2 className="font-display font-bold text-heading sm:text-title md:text-display text-text-bright tracking-tight">
            Built for how humans actually create.
          </h2>
          <p className="text-body text-text-secondary">
            Writing and problem solving are messy, iterative, and deeply personal.
            Strata gives you the calm canvas and thoughtful partner you need to bring ideas home.
          </p>
        </motion.div>

        {/* 3 Value Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                variants={cardVariants}
                {...cardHoverProps}
                className="bg-surface-raised border border-edge-raised rounded-3xl p-6 sm:p-8 shadow-card flex flex-col justify-between space-y-6 hover:border-edge-hover hover:shadow-card-lg transition-colors duration-200"
              >
                <div className="space-y-4">
                  <div
                    className={`w-12 h-12 rounded-2xl ${pillar.badgeBg} border ${pillar.badgeBorder} flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${pillar.accent}`} />
                  </div>
                  <h3 className="font-display font-bold text-subheading text-text-bright tracking-tight">
                    {pillar.title}
                  </h3>
                  <p className="text-body text-text-secondary leading-relaxed">
                    {pillar.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-edge-default text-caption font-medium text-text-muted">
                  {pillar.highlight}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
