'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  cardHoverProps,
  viewportOnce,
} from '@/components/landing/animations';

interface EngineCardData {
  initial: string;
  badgeLeft: string;
  badgeRight: string;
  name: string;
  category: string;
  isAccent?: boolean;
  summary: string;
  description: string;
}

const ENGINES: EngineCardData[] = [
  {
    initial: 'G',
    badgeLeft: 'Default',
    badgeRight: '128k context',
    name: 'Gemini 3.5',
    category: 'Studio Architect',
    isAccent: false,
    summary: 'Primary multimodal agent for multi-step file creation & editing.',
    description:
      'Google Gemini 3.5 Flash serves as the primary reasoning engine, supporting up to 4 image attachments, autonomous tool calling, and live workspace mutation loops.',
  },
  {
    initial: 'D',
    badgeLeft: 'Reasoning',
    badgeRight: 'High effort',
    name: 'DeepSeek V4',
    category: 'Code & Logic',
    isAccent: false,
    summary: 'High-effort algorithmic reasoning for surgical code refactoring.',
    description:
      'Fireworks-hosted DeepSeek V4 Flash 0731 delivers ultra-low first-token latency with dynamic reasoning effort for complex architectural refactoring and string edits.',
  },
  {
    initial: 'T',
    badgeLeft: 'Realtime',
    badgeRight: 'Neural search',
    name: 'Tavily Search',
    category: 'Web Intelligence',
    isAccent: false,
    summary: 'Direct URL text extraction and structured web research.',
    description:
      'Live search and extraction tools parse documentation, research papers, and technical APIs into clean markdown payloads without ad clutter or synthetic hallucinations.',
  },
  {
    initial: 'C',
    badgeLeft: 'Memory',
    badgeRight: '-84% tokens',
    name: 'Compactor',
    category: 'State Synthesis',
    isAccent: true,
    summary: 'Surgical context compaction engine for long projects.',
    description:
      'Dedicated Gemini 3.1 Flash Lite synthesis engine distills sprawling multi-turn dialogue into dense, permanent working state—completely preventing context rot.',
  },
];

export function LandingEngines() {
  return (
    <section
      id="engines"
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
            <h2 className="font-display font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight text-text-bright leading-[0.95] uppercase">
              Engineered <br />
              with precision<span className="text-primary">.</span>
            </h2>
          </motion.div>

          {/* 4 Big Typographic Cards */}
          <motion.div
            variants={staggerContainerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {ENGINES.map((engine) => (
              <motion.div
                key={engine.name}
                variants={fadeUpVariants}
                {...cardHoverProps}
                className={`relative aspect-[4/5] rounded-2xl sm:rounded-3xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-card transition-all duration-300 ${
                  engine.isAccent
                    ? 'bg-primary text-surface'
                    : 'bg-[#171310] dark:bg-[#1f1a16] text-[#f2ede6] border border-white/10'
                }`}
              >
                {/* Top Badges */}
                <div className="flex items-center justify-between text-micro font-mono uppercase relative z-10">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold tracking-wider ${
                      engine.isAccent
                        ? 'bg-surface/20 text-surface'
                        : 'bg-white/10 text-white/90'
                    }`}
                  >
                    {engine.badgeLeft}
                  </span>
                  <span className={engine.isAccent ? 'text-surface/80 font-medium' : 'text-white/70'}>
                    {engine.badgeRight}
                  </span>
                </div>

                {/* Giant Typographic Initial Glyphs */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <span
                    className={`font-display font-black text-[14rem] sm:text-[16rem] leading-none tracking-tighter ${
                      engine.isAccent ? 'text-surface/90' : 'text-white'
                    }`}
                  >
                    {engine.initial}
                  </span>
                </div>

                {/* Bottom Label */}
                <div className="relative z-10 space-y-0.5">
                  <h3
                    className={`font-display font-bold text-subheading sm:text-heading ${
                      engine.isAccent ? 'text-surface' : 'text-white'
                    }`}
                  >
                    {engine.name}
                  </h3>
                  <p
                    className={`text-micro font-mono uppercase tracking-wider ${
                      engine.isAccent ? 'text-surface/80' : 'text-white/60'
                    }`}
                  >
                    {engine.category}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* 4 Description Blocks Underneath */}
          <motion.div
            variants={staggerContainerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-6 border-t border-edge-default"
          >
            {ENGINES.map((engine) => (
              <motion.div
                key={engine.name + '-desc'}
                variants={fadeUpVariants}
                className="space-y-2"
              >
                <h4 className="text-micro font-mono font-bold uppercase tracking-wider text-text-bright">
                  {engine.name}
                </h4>
                <p className="text-caption text-text-secondary font-sans leading-relaxed">
                  {engine.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
