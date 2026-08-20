'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Palette, Eye, Cpu, FileCode2 } from 'lucide-react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  cardVariants,
  cardHoverProps,
  viewportOnce,
} from './animations';

const DETAILS = [
  {
    icon: Palette,
    title: 'Studio Linen & Dark Espresso',
    description:
      'Warm, glare-free linen paper by day, rich tactile espresso by night. Tuned to protect your eyes during uninterrupted writing flow.',
  },
  {
    icon: Eye,
    title: 'Visual Thinking & Image Inputs',
    description:
      'Drop in handwritten notes, diagrams, wireframes, or mood boards. Strata analyzes images visually to inform your documents.',
  },
  {
    icon: Cpu,
    title: 'Infinite Context with /compact',
    description:
      'Never hit sudden conversation walls. Long sessions distill into structured memory anchors so your project stays fresh and responsive.',
  },
  {
    icon: FileCode2,
    title: '24+ Formats & Clean Markdown',
    description:
      'From essays and proposals to scripts and configuration files. Clean syntax highlighting, line numbers, and seamless copy.',
  },
];

/**
 * Details component showing the craft and attention to detail in Strata AI.
 */
export function LandingDetails() {
  return (
    <section id="details" className="py-16 md:py-24 border-t border-edge-default">
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12"
      >
        <motion.div variants={fadeUpVariants} className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated border border-edge-raised text-micro font-semibold uppercase tracking-wider text-text-muted">
            The Craft
          </div>
          <h2 className="font-display font-bold text-heading sm:text-title md:text-display text-text-bright tracking-tight">
            Thoughtful details for deep work.
          </h2>
          <p className="text-body text-text-secondary">
            Every element is tuned for clarity, comfort, and sustained focus.
          </p>
        </motion.div>

        {/* 2x2 Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DETAILS.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                variants={cardVariants}
                {...cardHoverProps}
                className="bg-surface-raised border border-edge-raised rounded-3xl p-6 sm:p-8 shadow-card flex items-start gap-4 hover:border-edge-hover transition-colors duration-150"
              >
                <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-edge-raised flex items-center justify-center shrink-0 mt-1">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-subheading text-text-bright">
                    {item.title}
                  </h3>
                  <p className="text-body text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
