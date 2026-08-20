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

/**
 * Viewport configuration to ensure scroll animations only trigger once.
 */
export const viewportOnce = {
  once: true,
  amount: 0.25,
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
  hidden: { opacity: 0, y: 14 },
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
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: gentleSpring,
  },
};

/**
 * Crossfade transition for switching interactive scenarios.
 */
export const scenarioContentVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.14, ease: 'easeIn' },
  },
};

/**
 * Subtle interactive hover feedback presets.
 */
export const buttonHoverProps = {
  whileHover: { scale: 1.015 },
  whileTap: { scale: 0.985 },
  transition: { duration: 0.12 } as Transition,
};

export const cardHoverProps = {
  whileHover: { y: -3 },
  transition: { duration: 0.2, ease: 'easeOut' } as Transition,
};
