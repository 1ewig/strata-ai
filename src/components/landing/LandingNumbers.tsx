'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  cardVariants,
  viewportOnce,
} from '@/components/landing/animations';

const METRICS = [
  {
    value: '8',
    title: 'Hands-on tools',
    description: 'searching, editing, reading, and organizing files',
  },
  {
    value: '128k',
    title: 'Room to think',
    description: 'generous memory so conversations never lose context',
  },
  {
    value: '0ms',
    title: 'Zero cloud lag',
    description: 'everything saves privately and instantly to your device',
  },
  {
    value: '84%',
    title: 'Clutter saved',
    description: 'turns long back-and-forth into clear, clean summaries',
  },
];

const PILLARS = [
  {
    tag: 'PRECISE EDITING',
    description:
      'The assistant updates exact lines in your drafts without rewriting or losing your original tone and style.',
  },
  {
    tag: 'LIVE WRITING',
    description:
      'Watch documents take shape on your canvas in real time as the assistant works through ideas alongside you.',
  },
  {
    tag: 'CLEAR AWARENESS',
    description:
      'Always see where your project stands, how much room you have left, and exactly what changes were made.',
  },
  {
    tag: 'YOURS TO KEEP',
    description:
      'Your files live on your computer. No hidden servers, no tracking, and complete privacy for all your thoughts.',
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
            <h2 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight text-text-bright leading-[1.02] uppercase">
              Where real <br className="hidden sm:inline" />
              momentum finds <br className="hidden sm:inline" />
              its shape<span className="text-primary">.</span>
            </h2>
          </motion.div>

          {/* 4 Massive Metric Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 pt-4">
            {METRICS.map((metric) => (
              <motion.div
                key={metric.title}
                variants={cardVariants}
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
          </div>

          {/* 4 Architectural Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-8 border-t border-edge-default">
            {PILLARS.map((pillar) => (
              <motion.div
                key={pillar.tag}
                variants={cardVariants}
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
          </div>
        </motion.div>
      </div>
    </section>
  );
}
