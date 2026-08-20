'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Layers, Globe, Sparkles, CheckCircle2, Bookmark, ArrowUpRight } from 'lucide-react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  cardVariants,
  artifactHoverProps,
  marginaliaVariants,
  viewportOnce,
} from '@/components/landing/animations';

export function LandingArtifacts() {
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null);

  return (
    <section id="artifacts" className="py-20 sm:py-28 border-t border-edge-default relative">
      {/* Section Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-16 text-center">
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="space-y-3"
        >
          <motion.div variants={fadeUpVariants} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated border border-edge-raised text-micro font-mono uppercase tracking-widest text-text-secondary">
            <span>+ 02 / The Material Output</span>
          </motion.div>

          <motion.h2 variants={fadeUpVariants} className="text-title sm:text-heading font-bold text-text-bright font-display tracking-tight">
            Work you can touch, hold, and own.
          </motion.h2>

          <motion.p variants={fadeUpVariants} className="text-body text-text-secondary max-w-xl mx-auto leading-relaxed">
            Most chat interfaces evaporate when you close the tab. Strata turns reasoning into physical, durable assets inside your local browser storage.
          </motion.p>
        </motion.div>
      </div>

      {/* The 3 Living Artifacts Showcase */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Artifact 1: The 3x5 Compaction Index Card */}
          <motion.div
            variants={cardVariants}
            {...artifactHoverProps}
            className="group relative flex flex-col justify-between p-6 rounded-3xl bg-surface-raised dark:bg-surface-elevated/80 border border-edge-raised shadow-card hover:shadow-card-lg transition-all duration-200"
          >
            {/* Top Index Card Punch & Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-dashed border-edge-raised mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/80 shrink-0" />
                  <span className="text-micro font-mono uppercase tracking-wider text-text-muted">INDEX NO. 084 / COMPACTION</span>
                </div>
                <span className="text-micro font-mono text-primary font-bold px-2 py-0.5 rounded bg-primary-soft border border-primary/20">
                  -84% TOKENS
                </span>
              </div>

              <h3 className="text-subheading font-bold text-text-bright font-display mb-2">
                The Context Index Card
              </h3>
              <p className="text-caption text-text-secondary leading-relaxed mb-6 font-sans">
                Never suffer from context rot or memory amnesia. The `/compact` engine distills hundreds of turns into a dense, permanent working state.
              </p>

              {/* Physical Typewriter Card Specimen */}
              <div className="p-4 rounded-2xl bg-surface-base/80 dark:bg-surface-base/60 border border-edge-default font-mono text-caption text-text-secondary space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between text-micro text-text-muted pb-1 border-b border-edge-default">
                  <span>STATE: ACTIVE_SESSION</span>
                  <span>FILES: 4 ATTACHED</span>
                </div>
                <p className="text-micro text-text-primary leading-relaxed">
                  [1] ARCHITECTURE: PostgreSQL + Better Auth pooler.<br />
                  [2] PIPELINE: SSE streamText with tool delta coalescing.<br />
                  [3] DECISION: Strict Milo design system compliance.
                </p>
                <div className="flex items-center gap-1.5 pt-1 text-micro text-accent-olive font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Pruned 42k history tokens cleanly</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-edge-default flex items-center justify-between text-micro text-text-muted font-mono">
              <span>ALGORITHM: GEMINI 3.1 LITE</span>
              <span>TIME: 1.2s</span>
            </div>
          </motion.div>

          {/* Artifact 2: The Living Draft Sheet with Marginalia */}
          <motion.div
            variants={cardVariants}
            {...artifactHoverProps}
            className="group relative flex flex-col justify-between p-6 rounded-3xl bg-surface-raised dark:bg-surface-elevated/80 border border-edge-raised shadow-card hover:shadow-card-lg transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-dashed border-edge-raised mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-secondary shrink-0" />
                  <span className="text-micro font-mono uppercase tracking-wider text-text-muted">MANUSCRIPT DRAFT</span>
                </div>
                <span className="text-micro font-mono text-secondary font-bold px-2 py-0.5 rounded bg-secondary-soft border border-secondary/20">
                  LIVE WORKSPACE
                </span>
              </div>

              <h3 className="text-subheading font-bold text-text-bright font-display mb-2">
                The Living Manuscript
              </h3>
              <p className="text-caption text-text-secondary leading-relaxed mb-6 font-sans">
                Edits happen directly to your files. Strata surgically updates sections, inserts citations, and leaves transparent editorial traces.
              </p>

              {/* Manuscript Page with Interactive Margin Notes */}
              <div className="p-4 rounded-2xl bg-surface-base/80 dark:bg-surface-base/60 border border-edge-default text-caption space-y-2 relative">
                <div className="flex items-center justify-between text-micro font-mono text-text-muted pb-1 border-b border-edge-default">
                  <span>FILE: /workspace/manifesto.md</span>
                  <span>v3.4</span>
                </div>
                <div className="relative">
                  <p className="text-caption text-text-primary leading-relaxed font-sans">
                    Software should feel like an artisan&apos;s workshop. We reject disposable conversations in favor of{' '}
                    <button
                      type="button"
                      onMouseEnter={() => setActiveAnnotation(1)}
                      onMouseLeave={() => setActiveAnnotation(null)}
                      className="bg-secondary-soft text-secondary font-semibold px-1 rounded underline decoration-secondary cursor-pointer transition-colors"
                    >
                      durable artifacts
                    </button>{' '}
                    that compound over time.
                  </p>

                  {/* Marginalia popup bubble */}
                  <AnimatePresence>
                    {activeAnnotation === 1 && (
                      <motion.div
                        variants={marginaliaVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute left-2 -top-12 z-20 px-3 py-1.5 rounded-xl bg-surface-elevated border border-edge-raised shadow-card-lg text-micro font-mono text-text-bright flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-secondary shrink-0" />
                        <span>AI Editor note: Refined for clarity & cadence</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-1.5 pt-1 text-micro text-text-muted font-mono">
                  <span>+ writeFile + editFile surgical diffs</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-edge-default flex items-center justify-between text-micro text-text-muted font-mono">
              <span>STORAGE: DEXIE INDEXEDDB</span>
              <span>LOCAL FIRST</span>
            </div>
          </motion.div>

          {/* Artifact 3: The Field Exploration Ledger */}
          <motion.div
            variants={cardVariants}
            {...artifactHoverProps}
            className="group relative flex flex-col justify-between p-6 rounded-3xl bg-surface-raised dark:bg-surface-elevated/80 border border-edge-raised shadow-card hover:shadow-card-lg transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-dashed border-edge-raised mb-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-info shrink-0" />
                  <span className="text-micro font-mono uppercase tracking-wider text-text-muted">FIELD LEDGER / REALTIME</span>
                </div>
                <span className="text-micro font-mono text-info font-bold px-2 py-0.5 rounded bg-info/10 border border-info/20">
                  TAVILY REALTIME
                </span>
              </div>

              <h3 className="text-subheading font-bold text-text-bright font-display mb-2">
                The Field Ledger
              </h3>
              <p className="text-caption text-text-secondary leading-relaxed mb-6 font-sans">
                Real-time internet intelligence parsed into concise citations and structured notes without synthetic hallucination.
              </p>

              {/* Research Ledger Specimen */}
              <div className="p-4 rounded-2xl bg-surface-base/80 dark:bg-surface-base/60 border border-edge-default font-mono text-caption text-text-secondary space-y-2 relative">
                <div className="flex items-center justify-between text-micro text-text-muted pb-1 border-b border-edge-default">
                  <span>QUERY: &ldquo;agentic design 2026&rdquo;</span>
                  <span>5 SOURCES</span>
                </div>
                <div className="space-y-1.5 text-micro">
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-surface-raised/80 dark:bg-surface-elevated/80 border border-edge-default">
                    <span className="truncate text-text-primary font-semibold">arXiv:2604.11920 (State Compaction)</span>
                    <ArrowUpRight className="w-3 h-3 text-text-muted shrink-0" />
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-surface-raised/80 dark:bg-surface-elevated/80 border border-edge-default">
                    <span className="truncate text-text-primary font-semibold">ACM Digital Library (Atelier UI)</span>
                    <ArrowUpRight className="w-3 h-3 text-text-muted shrink-0" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1 text-micro text-info font-semibold">
                  <Bookmark className="w-3.5 h-3.5 shrink-0" />
                  <span>All sources verified & pinned to canvas</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-edge-default flex items-center justify-between text-micro text-text-muted font-mono">
              <span>LATENCY: 420ms</span>
              <span>RAW CLEAN TEXT</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
