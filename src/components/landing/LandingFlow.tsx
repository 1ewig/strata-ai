'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MessageSquarePlus, Compass, Sparkles, ArrowRight } from 'lucide-react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  cardVariants,
  cardHoverProps,
  viewportOnce,
} from './animations';

const STEPS = [
  {
    step: '01',
    title: 'Spark',
    subtitle: 'Converse freely',
    icon: MessageSquarePlus,
    description:
      'Speak your mind without worrying about formatting or outlines. Dump raw notes, paste bullet points, or brainstorm open-ended questions.',
  },
  {
    step: '02',
    title: 'Shape',
    subtitle: 'Living files on your canvas',
    icon: Compass,
    description:
      'Strata drafts and organizes your work into real, multi-file documents. Fact-checks, structures arguments, and organizes ideas beside your chat.',
  },
  {
    step: '03',
    title: 'Polish',
    subtitle: 'Surgical refinement & export',
    icon: Sparkles,
    description:
      'Inspect the rendered draft, request sentence-level adjustments, and polish until it shines. Ready to copy, export, or keep locally forever.',
  },
];

/**
 * Section presenting the three natural steps of working in Strata Studio.
 */
export function LandingFlow() {
  return (
    <section id="flow" className="py-16 md:py-24 border-t border-edge-default bg-surface-base/50">
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12"
      >
        <motion.div variants={fadeUpVariants} className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated border border-edge-raised text-micro font-semibold uppercase tracking-wider text-text-muted">
            The Flow
          </div>
          <h2 className="font-display font-bold text-heading sm:text-title md:text-display text-text-bright tracking-tight">
            How ideas take shape.
          </h2>
          <p className="text-body text-text-secondary">
            A simple, intuitive rhythm designed to get you out of blank-page paralysis
            and into clear, structured writing.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                variants={cardVariants}
                {...cardHoverProps}
                className="bg-surface-raised border border-edge-raised rounded-3xl p-6 sm:p-8 shadow-card flex flex-col justify-between space-y-6 relative group hover:border-edge-hover hover:shadow-card-lg transition-colors duration-200"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-caption font-bold text-primary px-2.5 py-1 rounded-lg bg-primary-soft border border-primary/20">
                      {step.step}
                    </span>
                    <Icon className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-subheading text-text-bright">
                      {step.title}
                    </h3>
                    <p className="text-caption font-medium text-text-muted">{step.subtitle}</p>
                  </div>

                  <p className="text-body text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {idx < STEPS.length - 1 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-surface-raised border border-edge-raised text-text-muted">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
