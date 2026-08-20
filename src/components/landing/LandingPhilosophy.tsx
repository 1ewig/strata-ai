'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Hammer, Cpu, Repeat } from 'lucide-react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  cardVariants,
  viewportOnce,
} from '@/components/landing/animations';

const TENETS = [
  {
    num: '01',
    title: 'The Atelier, Not the Slot Machine',
    subtitle: 'Human Agency & Attentive Intelligence',
    description:
      'Most generative AI encourages blind prompt-pulling. Strata provides a tranquil drawing table where models observe your workspace files, propose surgical edits, and act as skilled studio apprentices rather than mysterious oracles.',
    badge: 'AGENCY FIRST',
  },
  {
    num: '02',
    title: 'Durable Files, Not Disposable Bubbles',
    subtitle: 'Local-First Document Longevity',
    description:
      'Chat streams evaporate the moment you close the tab. Every line of thought in Strata lives in real, exportable Markdown files inside your local browser database with instant file history and live canvas rendering.',
    badge: 'LOCAL FIRST',
  },
  {
    num: '03',
    title: 'Surgical Compaction, Not Context Rot',
    subtitle: 'Continuous Clarity Across Long Projects',
    description:
      'Large language models degrade as token histories become cluttered. Our dedicated compaction engine distills sprawling multi-step research and tool traces into crystalline memory cards so deep projects stay fast and sharp.',
    badge: 'ZERO AMNESIA',
  },
];

export function LandingPhilosophy() {
  return (
    <section id="philosophy" className="py-20 sm:py-28 border-t border-edge-default relative bg-surface-base/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-16 text-center">
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="space-y-3"
        >
          <motion.div variants={fadeUpVariants} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated border border-edge-raised text-micro font-mono uppercase tracking-widest text-text-secondary">
            <span>+ 03 / The Three Tenets</span>
          </motion.div>

          <motion.h2 variants={fadeUpVariants} className="text-title sm:text-heading font-bold text-text-bright font-display tracking-tight">
            How we design for human thought.
          </motion.h2>

          <motion.p variants={fadeUpVariants} className="text-body text-text-secondary max-w-xl mx-auto leading-relaxed">
            Software shapes how we reason. Strata is engineered to protect focus, encourage craftsmanship, and dignify your work.
          </motion.p>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {TENETS.map((tenet) => (
            <motion.div
              key={tenet.num}
              variants={cardVariants}
              className="flex flex-col justify-between p-8 rounded-3xl bg-surface-raised dark:bg-surface-elevated/70 border border-edge-raised shadow-card hover:shadow-card-lg transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-edge-default">
                  <span className="text-title font-mono font-bold text-primary">
                    {tenet.num}
                  </span>
                  <span className="text-micro font-mono tracking-wider uppercase text-text-muted px-2 py-0.5 rounded bg-surface-base border border-edge-default">
                    {tenet.badge}
                  </span>
                </div>

                <h3 className="text-subheading font-bold text-text-bright font-display mb-1.5">
                  {tenet.title}
                </h3>
                <p className="text-caption font-semibold text-secondary mb-4 font-sans">
                  {tenet.subtitle}
                </p>
                <p className="text-body text-text-secondary leading-relaxed font-sans text-label">
                  {tenet.description}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-edge-default flex items-center gap-2 text-micro font-mono text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span>PREREQUISITE OF STRATA CRAFT</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
