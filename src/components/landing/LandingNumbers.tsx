'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  viewportOnce,
} from '@/components/landing/animations';

const METRICS = [
  {
    value: '8',
    title: 'Integrated tools',
    description: 'workspace CRUD + Tavily realtime search',
  },
  {
    value: '128k',
    title: 'Context window',
    description: 'active token budgeting & cost metrics',
  },
  {
    value: '0ms',
    title: 'Cloud storage latency',
    description: '100% local-first Dexie IndexedDB',
  },
  {
    value: '-84%',
    title: 'Token compaction delta',
    description: 'zero memory amnesia via /compact',
  },
];

const PILLARS = [
  {
    tag: 'WORKSPACE ENGINE',
    description:
      'Surgical 3-tier string edit engine with exact, whitespace-normalized, and 2-point anchor bounded matching.',
  },
  {
    tag: 'LIVE STREAMING',
    description:
      'Custom data-workspace SSE channel updates multi-file canvas tabs live in parallel with model reasoning.',
  },
  {
    tag: 'OBSERVABILITY',
    description:
      'OpenTelemetry trace waterfalls, token budgeting, and transparent per-model dollar expense accounting.',
  },
  {
    tag: 'LOCAL FIRST',
    description:
      'Dexie IndexedDB v5 schema with per-user isolation stores all files locally with zero server retention.',
  },
];

const PIPELINE_STEPS = [
  {
    num: '01 Ingest',
    description:
      'Inspect workspace files, extract URL text, and gather realtime research citations.',
  },
  {
    num: '02 Mutate',
    description:
      'Execute multi-step file writes, surgical edits, and language re-indexing.',
  },
  {
    num: '03 Reconcile',
    description:
      'Render syntax-highlighted code, persist state, and distill long-context memory.',
  },
];

export function LandingNumbers() {
  return (
    <section
      id="numbers"
      className="py-20 sm:py-32 border-t border-edge-default relative px-4 sm:px-8 lg:px-12"
    >
      <div className="max-w-7xl mx-auto w-full">
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="space-y-16 sm:space-y-24"
        >
          {/* Bold Headline */}
          <motion.div variants={fadeUpVariants} className="max-w-4xl">
            <h2 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight text-text-bright leading-[1.02]">
              What we engineered <br className="hidden sm:inline" />
              into the studio.
            </h2>
          </motion.div>

          {/* 4 Massive Metric Pillars */}
          <motion.div
            variants={staggerContainerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 pt-4"
          >
            {METRICS.map((metric) => (
              <motion.div
                key={metric.title}
                variants={fadeUpVariants}
                className="pt-6 border-t-2 border-text-bright flex flex-col justify-between space-y-4"
              >
                <div className="font-display font-black text-6xl sm:text-7xl lg:text-8xl tracking-tighter text-text-bright leading-none">
                  {metric.value}
                </div>
                <div>
                  <h3 className="font-display font-bold text-label text-text-bright mb-1">
                    {metric.title}
                  </h3>
                  <p className="text-caption text-text-secondary font-sans leading-normal">
                    {metric.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* 4 Architectural Columns */}
          <motion.div
            variants={staggerContainerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-8 border-t border-edge-default"
          >
            {PILLARS.map((pillar) => (
              <motion.div
                key={pillar.tag}
                variants={fadeUpVariants}
                className="space-y-2"
              >
                <h4 className="text-micro font-mono font-bold uppercase tracking-wider text-text-bright">
                  {pillar.tag}
                </h4>
                <p className="text-caption text-text-secondary font-sans leading-relaxed">
                  {pillar.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* 3 Step Sequence at Bottom */}
          <motion.div
            variants={staggerContainerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-dashed border-edge-raised"
          >
            {PIPELINE_STEPS.map((step) => (
              <motion.div
                key={step.num}
                variants={fadeUpVariants}
                className="space-y-1.5"
              >
                <span className="text-micro font-mono font-bold text-primary uppercase">
                  {step.num}
                </span>
                <p className="text-caption text-text-secondary font-sans leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
