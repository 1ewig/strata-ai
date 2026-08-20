'use client';

import React from 'react';
import Link from 'next/link';
import { motion, type TargetAndTransition } from 'motion/react';
import {
  ArrowRight,
  FilePlus2,
  FileEdit,
  FileSearch,
  Globe,
  Link2,
  Layers,
} from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';
import {
  staggerContainerVariants,
  fadeUpVariants,
  buttonHoverProps,
} from '@/components/landing/animations';

interface LandingHeroProps {
  userId?: string;
  onOpenStudio: () => void;
}

interface ToolBadgeConfig {
  icon: typeof FilePlus2;
  label: string;
  badge: string;
  position: string;
  accent: string;
  floatAnimation: TargetAndTransition;
}

const SURROUNDING_TOOLS: ToolBadgeConfig[] = [
  {
    icon: FilePlus2,
    label: 'writeFile',
    badge: 'CREATE',
    position: 'top-6 left-2 lg:left-10',
    accent: 'text-primary',
    floatAnimation: { y: [0, -6, 0], transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' } },
  },
  {
    icon: Globe,
    label: 'webSearch',
    badge: 'REALTIME',
    position: 'top-8 right-2 lg:right-10',
    accent: 'text-info',
    floatAnimation: { y: [0, 7, 0], transition: { duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 } },
  },
  {
    icon: FileEdit,
    label: 'editFile',
    badge: 'DIFFS',
    position: 'bottom-10 left-4 lg:left-14',
    accent: 'text-secondary',
    floatAnimation: { y: [0, -7, 0], transition: { duration: 5.1, repeat: Infinity, ease: 'easeInOut', delay: 1 } },
  },
  {
    icon: Link2,
    label: 'extractUrl',
    badge: 'CITATIONS',
    position: 'bottom-10 right-4 lg:right-14',
    accent: 'text-accent-olive',
    floatAnimation: { y: [0, 6, 0], transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 } },
  },
  {
    icon: Layers,
    label: 'compactContext',
    badge: 'MEMORY',
    position: 'top-1/2 -translate-y-1/2 left-0 lg:left-4 hidden md:flex',
    accent: 'text-primary',
    floatAnimation: { y: [0, -5, 0], transition: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 } },
  },
  {
    icon: FileSearch,
    label: 'readFile',
    badge: 'INSPECT',
    position: 'top-1/2 -translate-y-1/2 right-0 lg:right-4 hidden md:flex',
    accent: 'text-info',
    floatAnimation: { y: [0, 5, 0], transition: { duration: 5.0, repeat: Infinity, ease: 'easeInOut', delay: 1.2 } },
  },
];

export function LandingHero({ userId, onOpenStudio }: LandingHeroProps) {
  return (
    <section className="relative pt-24 pb-20 sm:pt-32 sm:pb-28 overflow-hidden">
      {/* Architectural Background Grid & Registration Marks */}
      <div className="absolute inset-0 pointer-events-none -z-10 select-none overflow-hidden">
        {/* Subtle coordinate crosshairs */}
        <span className="absolute top-12 left-8 text-micro font-mono text-text-faint/60 tracking-widest">+ 01 / ATELIER</span>
        <span className="absolute top-12 right-8 text-micro font-mono text-text-faint/60 tracking-widest">37.7749° N, 122.4194° W</span>
        <span className="absolute bottom-10 left-8 text-micro font-mono text-text-faint/60 tracking-widest">EDITION 2026.08</span>
        <span className="absolute bottom-10 right-8 text-micro font-mono text-text-faint/60 tracking-widest">+ + +</span>

        {/* Stratum contour grid pattern */}
        <svg
          className="absolute w-full h-full inset-0 opacity-[0.035] dark:opacity-[0.06] text-text-primary"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="strata-grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M 64 0 L 0 0 0 64" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#strata-grid)" />
        </svg>
      </div>

      {/* Floating Surrounding Tool Badges (Desktop & Tablet Orbital Toolbelt) */}
      <div className="absolute inset-0 max-w-6xl mx-auto pointer-events-none -z-0 hidden md:block">
        {SURROUNDING_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.label}
              animate={tool.floatAnimation}
              className={`absolute ${tool.position} pointer-events-auto select-none`}
            >
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-raised/90 dark:bg-surface-elevated/85 backdrop-blur-md border border-edge-raised shadow-button hover:shadow-card hover:border-edge-hover transition-all duration-200 cursor-default group">
                <Icon className={`w-3.5 h-3.5 ${tool.accent} shrink-0 transition-transform duration-200 group-hover:scale-110`} />
                <span className="text-caption font-mono font-semibold text-text-primary group-hover:text-text-bright">
                  {tool.label}
                </span>
                <span className="text-micro font-mono text-text-muted px-1.5 py-0.2 rounded bg-surface-base border border-edge-default uppercase">
                  {tool.badge}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center space-y-8"
        >
          {/* Eyebrow badge with glowing brand emblem */}
          <motion.div variants={fadeUpVariants} className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-edge-raised bg-surface-raised/80 dark:bg-surface-elevated/70 backdrop-blur-md shadow-button">
              <StrataIcon className="w-4 h-4" />
              <span className="text-micro font-mono tracking-wider uppercase text-text-secondary font-semibold">
                An Atelier for Human & Machine Craft
              </span>
            </div>
          </motion.div>

          {/* Main Editorial Headline */}
          <motion.h1
            variants={fadeUpVariants}
            className="text-display sm:text-[3.25rem] sm:leading-[1.12] font-bold text-text-bright font-display tracking-tight max-w-3xl"
          >
            The workshop for thought that outlasts the chat.
          </motion.h1>

          {/* Editorial Sub-copy */}
          <motion.p
            variants={fadeUpVariants}
            className="text-body sm:text-subheading text-text-secondary max-w-2xl leading-relaxed font-sans"
          >
            Most AI tools treat thinking like a slot machine—disposable prompts lost in endless chat streams.
            Strata is a tactile studio where intelligence shapes living, durable Markdown documents alongside you.
          </motion.p>

          {/* Primary Action Buttons */}
          <motion.div
            variants={fadeUpVariants}
            className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto"
          >
            <motion.button
              type="button"
              onClick={onOpenStudio}
              {...buttonHoverProps}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-hover active:scale-[0.98] text-surface font-semibold text-label shadow-button flex items-center justify-center gap-2 transition-colors cursor-pointer group"
            >
              <span>{userId ? 'Enter Workspace' : 'Open the Atelier'}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </motion.button>

            {!userId && (
              <Link
                href="/auth/signin"
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-edge-raised hover:border-edge-hover bg-surface-raised/80 dark:bg-surface-elevated/80 hover:bg-surface-hover text-text-primary font-semibold text-label shadow-button transition-colors text-center"
              >
                Sign In
              </Link>
            )}
          </motion.div>

          {/* Mobile Tools Strip (Visible on mobile where orbital badges are hidden) */}
          <motion.div
            variants={fadeUpVariants}
            className="md:hidden pt-4 flex flex-col items-center gap-2 w-full"
          >
            <span className="text-micro font-mono uppercase tracking-widest text-text-muted">
              Integrated Workspace Tools
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-sm">
              {SURROUNDING_TOOLS.map((t) => {
                const Icon = t.icon;
                return (
                  <div
                    key={t.label}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-raised/90 dark:bg-surface-elevated/80 border border-edge-raised text-micro font-mono text-text-secondary shadow-button"
                  >
                    <Icon className={`w-3 h-3 ${t.accent} shrink-0`} />
                    <span className="font-semibold">{t.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}