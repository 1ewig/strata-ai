import type { Variants, Transition } from 'motion/react';

/**
 * Gentle, organic spring and ease curves for a quiet, human atmosphere.
 */
export const softSpring: Transition = {
  type: 'spring',
  damping: 30,
  stiffness: 140,
};

export const gentleSpring: Transition = {
  type: 'spring',
  damping: 34,
  stiffness: 120,
};

export const tactileSpring: Transition = {
  type: 'spring',
  damping: 24,
  stiffness: 280,
};

/**
 * Viewport configuration to ensure scroll animations only trigger once.
 */
export const viewportOnce = {
  once: true,
  amount: 0.2,
};

/**
 * Stagger container for animating items with calm, unhurried pacing.
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.04,
    },
  },
};

/**
 * Natural fade-up animation for text and cards.
 */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: softSpring,
  },
};

/**
 * Card reveal animation.
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
 * Marginalia annotation bubble reveal animation.
 */
export const marginaliaVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 22, stiffness: 320 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 2,
    transition: { duration: 0.12, ease: 'easeIn' },
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

export const artifactHoverProps = {
  whileHover: { y: -4 },
  transition: { duration: 0.2, ease: 'easeOut' as const } as Transition,
};

export const specimenHoverProps = {
  whileHover: { y: -3 },
  transition: { duration: 0.2, ease: 'easeOut' as const } as Transition,
};
