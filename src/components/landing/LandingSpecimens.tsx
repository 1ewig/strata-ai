'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Cpu, Zap, Globe, Eye, Code, Terminal, Layers } from 'lucide-react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  cardVariants,
  specimenHoverProps,
  viewportOnce,
} from '@/components/landing/animations';

const SPECIMENS = [
  {
    id: 'gemini',
    name: 'Google Gemini 3.5',
    edition: 'FLASH / 2026.1',
    role: 'Primary Studio Architect',
    specs: [
      { label: 'Context Window', value: '1,048,576 Tokens' },
      { label: 'Multimodal Vision', value: 'Up to 4 Images (1280px)' },
      { label: 'Tool Protocol', value: 'Surgical Workspace Closure' },
    ],
    accentText: 'text-primary',
    borderHover: 'hover:border-primary/40',
    tag: 'DEFAULT ENGINE',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek V4',
    edition: 'FLASH / HIGH EFFORT',
    role: 'Logic & Code Refinement',
    specs: [
      { label: 'Reasoning Effort', value: 'Dynamic Stepping' },
      { label: 'Text Optimization', value: 'Pure Algorithmic Flow' },
      { label: 'Speed Baseline', value: 'Ultra-low First Token TTFT' },
    ],
    accentText: 'text-secondary',
    borderHover: 'hover:border-secondary/40',
    tag: 'REASONING SPEC',
  },
  {
    id: 'tavily',
    name: 'Tavily Search Engine',
    edition: 'REALTIME API',
    role: 'Neural Research Retrieval',
    specs: [
      { label: 'Content Depth', value: 'Direct URL Text Extraction' },
      { label: 'Source Verification', value: 'Structured arXiv & Web' },
      { label: 'Clean Payload', value: 'Zero Ad/Script Clutter' },
    ],
    accentText: 'text-info',
    borderHover: 'hover:border-info/40',
    tag: 'REALTIME LIVE',
  },
];

export function LandingSpecimens() {
  return (
    <section className="py-20 sm:py-28 border-t border-edge-default relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-16 text-center">
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="space-y-3"
        >
          <motion.div variants={fadeUpVariants} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated border border-edge-raised text-micro font-mono uppercase tracking-widest text-text-secondary">
            <span>+ 04 / The Engine Specimens</span>
          </motion.div>

          <motion.h2 variants={fadeUpVariants} className="text-title sm:text-heading font-bold text-text-bright font-display tracking-tight">
            Calibrated for precision, not theatrics.
          </motion.h2>

          <motion.p variants={fadeUpVariants} className="text-body text-text-secondary max-w-xl mx-auto leading-relaxed">
            Every model integrated into Strata is tuned for surgical document edits, honest citations, and deep structural reasoning.
          </motion.p>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {SPECIMENS.map((spec) => (
            <motion.div
              key={spec.id}
              variants={cardVariants}
              {...specimenHoverProps}
              className={`p-6 rounded-3xl bg-surface-raised dark:bg-surface-elevated/70 border border-edge-raised ${spec.borderHover} shadow-card hover:shadow-card-lg transition-all duration-200 flex flex-col justify-between`}
            >
              <div>
                {/* Calibration Plate Header */}
                <div className="flex items-center justify-between pb-3 border-b border-edge-default mb-4">
                  <span className="text-micro font-mono uppercase tracking-widest text-text-muted">
                    {spec.edition}
                  </span>
                  <span className="text-micro font-mono font-bold px-2 py-0.5 rounded bg-surface-base border border-edge-default text-text-secondary">
                    {spec.tag}
                  </span>
                </div>

                <h3 className="text-subheading font-bold text-text-bright font-display mb-1">
                  {spec.name}
                </h3>
                <p className={`text-caption font-semibold ${spec.accentText} mb-6 font-mono`}>
                  {spec.role}
                </p>

                {/* Specs List */}
                <div className="space-y-3 font-mono">
                  {spec.specs.map((item) => (
                    <div
                      key={item.label}
                      className="p-2.5 rounded-xl bg-surface-base/80 dark:bg-surface-base/50 border border-edge-default flex flex-col gap-0.5"
                    >
                      <span className="text-micro text-text-muted uppercase tracking-wider">
                        {item.label}
                      </span>
                      <span className="text-caption font-semibold text-text-primary">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-5 mt-6 border-t border-edge-default flex items-center justify-between text-micro font-mono text-text-muted">
                <span>ACTIVE CALIBRATION</span>
                <span>ONLINE</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
