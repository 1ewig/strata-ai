import type { Variants, Transition } from 'motion/react';

/**
 * Shared spring and ease transitions for subtle, natural feel.
 */
export const smoothSpring: Transition = {
  type: 'spring',
  damping: 24,
  stiffness: 200,
};

export const gentleSpring: Transition = {
  type: 'spring',
  damping: 28,
  stiffness: 160,
};

/**
 * Viewport configuration to ensure scroll animations only trigger once.
 */
export const viewportOnce = {
  once: true,
  amount: 0.2,
};

/**
 * Stagger container for animating children sequentially.
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

/**
 * Faster stagger container for feature grids.
 */
export const gridStaggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/**
 * Natural fade-up animation for text, badges, and headers.
 */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothSpring,
  },
};

/**
 * Soft fade-in animation without vertical translation.
 */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

/**
 * Card reveal animation for philosophy and flow steps.
 */
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: gentleSpring,
  },
};

/**
 * Crossfade slide transition for the interactive scenario switcher.
 */
export const scenarioContentVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

/**
 * Subtle interactive hover feedback presets.
 */
export const buttonHoverProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.12 } as Transition,
};

export const cardHoverProps = {
  whileHover: { y: -4 },
  transition: { duration: 0.2, ease: 'easeOut' } as Transition,
};
