'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  viewportOnce,
} from '@/components/landing/animations';

const PROCESS_STEPS = [
  {
    num: '01',
    title: 'Understand',
    description:
      'Reads your files, searches the web, and gets up to speed on your context and goals.',
  },
  {
    num: '02',
    title: 'Create',
    description:
      'Drafts thoughtful sections, makes surgical edits, and builds multi-file projects.',
  },
  {
    num: '03',
    title: 'Refine',
    description:
      'Polishes tone, formats code across 24+ languages, and updates your canvas live.',
  },
  {
    num: '04',
    title: 'Remember',
    description:
      'Turns long brainstorming sessions into clear recaps so you never lose the thread.',
  },
];

const ACCENT_BANNER_STEPS = [
  {
    num: '01',
    title: 'Drop an idea',
    desc: 'Start with rough bullet points, a fresh prompt, or existing notes.',
  },
  {
    num: '02',
    title: 'Work together',
    desc: 'The assistant suggests edits and checks facts in real time.',
  },
  {
    num: '03',
    title: 'Own the result',
    desc: 'Clean, structured markdown documents ready to share or export.',
  },
];

export function LandingProcess() {
  return (
    <section
      id="process"
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
          {/* Main 2-Column Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Headline Column */}
            <motion.div variants={fadeUpVariants} className="lg:col-span-5">
              <h2 className="font-display font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight text-text-bright leading-[0.95] uppercase sticky top-24">
                From first <br />
                spark to <br />
                finished <br />
                writing<span className="text-primary">.</span>
              </h2>
            </motion.div>

            {/* Right Numbered Interactive List */}
            <motion.div
              variants={staggerContainerVariants}
              className="lg:col-span-7 divide-y divide-edge-raised border-y border-edge-raised"
            >
              {PROCESS_STEPS.map((step) => (
                <motion.div
                  key={step.num}
                  variants={fadeUpVariants}
                  className="py-6 sm:py-8 group flex items-start justify-between gap-6 hover:pl-2 transition-all duration-200 cursor-default"
                >
                  <div className="flex items-start gap-6 sm:gap-10">
                    <span className="text-micro font-mono font-bold text-text-muted group-hover:text-primary transition-colors pt-1">
                      {step.num}
                    </span>
                    <div className="space-y-1 max-w-xl">
                      <h3 className="font-display font-bold text-subheading sm:text-heading text-text-bright group-hover:text-primary transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-caption sm:text-body text-text-secondary font-sans leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <ArrowUpRight className="w-5 h-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all shrink-0 mt-1" />
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Bottom High-Voltage Accent Block */}
          <motion.div
            variants={fadeUpVariants}
            className="p-8 sm:p-12 rounded-2xl sm:rounded-3xl bg-primary text-surface shadow-card hover:shadow-card-lg transition-all duration-300 relative overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Display Metric */}
              <div className="lg:col-span-5 space-y-1">
                <div className="font-display font-black text-5xl sm:text-7xl lg:text-8xl tracking-tighter leading-none text-surface flex items-baseline gap-2">
                  <span>0 → 1</span>
                  <span className="text-caption font-mono uppercase tracking-widest opacity-80">
                    in minutes
                  </span>
                </div>
              </div>

              {/* Right 3 Sub-step Columns */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-surface/25 lg:pl-8">
                {ACCENT_BANNER_STEPS.map((s) => (
                  <div key={s.num} className="space-y-1">
                    <div className="text-micro font-mono uppercase font-bold text-surface/80">
                      {s.num} {s.title}
                    </div>
                    <p className="text-caption text-surface/90 font-sans leading-snug">
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
