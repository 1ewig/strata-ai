'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Sparkles,
  Compass,
  ShieldCheck,
  HardDriveDownload,
  CheckCircle2
} from 'lucide-react';
import {
  staggerContainerVariants,
  fadeUpVariants,
  buttonHoverProps,
} from './animations';

/** Props for the LandingHero component. */
interface LandingHeroProps {
  /** The current user's id if authenticated. */
  userId?: string;
  /** Callback to launch the workspace for authenticated users. */
  onOpenStudio?: () => void;
}

/* -------------------------------------------------------------------------- */
/*                        CUSTOM HAND-CRAFTED SVG ASSETS                      */
/* -------------------------------------------------------------------------- */

/**
 * Topographic strata sediment curves representing layered thought & canvas architecture.
 */
function StrataTopographySVG({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 680"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="strata-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.14" />
          <stop offset="50%" stopColor="var(--color-secondary)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="strata-stroke-1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
          <stop offset="50%" stopColor="var(--color-secondary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="strata-stroke-2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Deepest geological stratum */}
      <path
        d="M-40 220C240 180 420 310 720 250C1020 190 1200 290 1480 210V680H-40V220Z"
        fill="url(#strata-grad-1)"
      />

      {/* Flowing layer line 1 */}
      <path
        d="M-20 190C280 140 460 270 760 210C1060 150 1240 260 1460 170"
        stroke="url(#strata-stroke-1)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="4 6"
      />

      {/* Flowing layer line 2 */}
      <path
        d="M-40 290C220 240 480 380 820 300C1120 230 1320 330 1480 270"
        stroke="url(#strata-stroke-2)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />

      {/* Flowing layer line 3 */}
      <path
        d="M0 420C340 370 580 490 920 410C1220 340 1380 430 1460 390"
        stroke="url(#strata-stroke-1)"
        strokeWidth="1"
        strokeOpacity="0.4"
      />
    </svg>
  );
}

/**
 * Hand-drawn warm marker flourish under key hero phrase.
 */
function MarkerFlourishSVG({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3 13C65 4 185 3 277 9C215 14 95 16 12 15"
        stroke="var(--color-secondary)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.4"
      />
      <path
        d="M18 10C80 5 190 6 265 11"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
    </svg>
  );
}

/**
 * Proprietary multi-layered geometric brand mark.
 */
function StrataLayerEmblemSVG({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="emblem-shadow" x="0" y="0" width="44" height="44" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(44, 38, 33, 0.15)" />
        </filter>
      </defs>

      {/* Bottom foundation sheet */}
      <rect
        x="6"
        y="22"
        width="28"
        height="14"
        rx="4"
        transform="rotate(-4 6 22)"
        fill="var(--color-surface-elevated)"
        stroke="var(--color-edge-raised)"
        strokeWidth="1.2"
      />

      {/* Mid file sheet */}
      <rect
        x="9"
        y="14"
        width="28"
        height="14"
        rx="4"
        transform="rotate(2 9 14)"
        fill="var(--color-surface-raised)"
        stroke="var(--color-secondary)"
        strokeWidth="1.2"
        strokeOpacity="0.5"
      />

      {/* Top electric active sheet */}
      <rect
        x="10"
        y="6"
        width="27"
        height="14"
        rx="4"
        fill="var(--color-primary)"
        filter="url(#emblem-shadow)"
      />

      {/* Precision grid notches on active sheet */}
      <line x1="15" y1="11" x2="23" y2="11" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="15" x2="31" y2="15" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.75" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                            HERO COMPONENT ROOT                             */
/* -------------------------------------------------------------------------- */

export function LandingHero({ userId, onOpenStudio }: LandingHeroProps) {
  return (
    <section className="relative pt-16 pb-16 md:pt-24 md:pb-24 overflow-hidden bg-surface-base selection:bg-primary-soft-strong selection:text-primary">
      {/* 1. Organic Strata Topographic Sediment Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <StrataTopographySVG className="w-full h-full object-cover opacity-70 dark:opacity-40" />
      </div>

      {/* 2. Tactile Radial Glow Highlights */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[720px] h-[340px] bg-primary-soft/50 dark:bg-primary-soft/20 rounded-full blur-[110px] pointer-events-none -z-10" />
      <div className="absolute top-48 right-10 w-[380px] h-[260px] bg-secondary-soft/40 dark:bg-secondary-soft/15 rounded-full blur-[90px] pointer-events-none -z-10" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
          className="text-center space-y-8"
        >
          {/* Eyebrow Pill with Proprietary Emblem */}
          <motion.div variants={fadeUpVariants} className="inline-flex items-center">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface-raised/90 backdrop-blur-md border border-edge-raised text-caption text-text-secondary shadow-button hover:border-edge-hover transition-all">
              <StrataLayerEmblemSVG className="w-5 h-5 -my-1" />
              <span className="font-medium text-text-primary">A quiet space to think</span>
              <span className="w-1 h-1 rounded-full bg-edge-hover" />
              <span className="text-secondary font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-secondary" />
                Local-First
              </span>
            </div>
          </motion.div>

          {/* Emotional Headline with Dynamic Marker Flourish */}
          <motion.div variants={fadeUpVariants} className="space-y-5">
            <h1 className="font-display font-bold text-text-bright text-display sm:text-[48px] md:text-[58px] tracking-tight leading-[1.08]">
              A quiet room to{' '}
              <span className="relative inline-block whitespace-nowrap">
                <span className="relative z-10 text-primary">think out loud.</span>
                <MarkerFlourishSVG className="absolute -bottom-3 left-0 w-full h-4 z-0 pointer-events-none" />
              </span>
            </h1>

            <p className="text-text-secondary text-subheading md:text-[1.25rem] font-normal leading-relaxed max-w-2xl mx-auto">
              Speak your mind without worrying about structure. Strata shapes your thoughts
              into real, living documents right beside you.
            </p>
          </motion.div>

          {/* Action Row */}
          <motion.div
            variants={fadeUpVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2"
          >
            {userId ? (
              <motion.button
                type="button"
                {...buttonHoverProps}
                onClick={onOpenStudio}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary transition-all cursor-pointer group"
              >
                <span>Open Your Studio</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </motion.button>
            ) : (
              <motion.div {...buttonHoverProps} className="w-full sm:w-auto">
                <Link
                  href="/auth/signup"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-surface text-label font-semibold shadow-button hover:shadow-glow-primary transition-all group"
                >
                  <span>Enter the Studio</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            )}

            <motion.a
              href="#canvas"
              {...buttonHoverProps}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-surface-raised/80 hover:bg-surface-hover border border-edge-raised text-text-primary text-label font-medium shadow-button transition-colors"
            >
              <Compass className="w-4 h-4 text-text-muted" />
              <span>See the living canvas</span>
            </motion.a>
          </motion.div>

          {/* Minimalist Trust & Reassurance Badges */}
          <motion.div
            variants={fadeUpVariants}
            className="pt-4 flex flex-wrap items-center justify-center gap-y-2.5 gap-x-6 text-caption text-text-muted"
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-olive" />
              <span>Local-first in your browser</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardDriveDownload className="w-3.5 h-3.5 text-text-secondary" />
              <span>No cloud baggage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>Private by default</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}