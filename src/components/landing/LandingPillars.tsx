'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  cardVariants,
  cardHoverProps,
  viewportOnce,
} from './animations';

const PILLARS = [
  {
    num: '01',
    title: 'Durable',
    description:
      'Thoughts are shaped directly into living files on your canvas. No more losing good paragraphs to the chat scrollback.',
  },
  {
    num: '02',
    title: 'Gentle',
    description:
      'Surgical edits pinpoint exact lines and sections — polishing structure and tone without erasing your natural style.',
  },
  {
    num: '03',
    title: 'Private',
    description:
      'Everything persists right in your browser. Fast, distraction-free, and private with zero cloud baggage.',
  },
];

/**
 * Three quiet principles presented with generous whitespace and low cognitive load.
 */
export function LandingPillars() {
  return (
    <section id="philosophy" className="py-16 md:py-24 border-t border-edge-default">
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12"
      >
        <motion.div variants={fadeUpVariants} className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-micro font-semibold uppercase tracking-wider text-text-muted">
            The Philosophy
          </span>
          <h2 className="font-display font-bold text-heading sm:text-title md:text-display text-text-bright tracking-tight">
            Three quiet promises.
          </h2>
          <p className="text-body text-text-secondary">
            Designed for how humans actually think, draft, and finish work.
          </p>
        </motion.div>

        {/* 3 Airy Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((pillar) => (
            <motion.div
              key={pillar.num}
              variants={cardVariants}
              {...cardHoverProps}
              className="bg-surface-raised border border-edge-raised rounded-3xl p-7 space-y-4 shadow-card hover:border-edge-hover transition-colors"
            >
              <span className="font-mono text-caption font-semibold text-primary px-2 py-0.5 rounded-lg bg-primary-soft">
                {pillar.num}
              </span>
              <h3 className="font-display font-bold text-subheading text-text-bright">
                {pillar.title}
              </h3>
              <p className="text-body text-text-secondary leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
