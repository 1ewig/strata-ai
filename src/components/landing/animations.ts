import type { Variants, Transition } from 'motion/react';

/**
 * Synchronized transition curves for parallel opacity and translation motion.
 * Uses a tailored cubic-bezier curve so both opacity and y decrescendo in unison.
 */
export const smoothParallelEase: Transition = {
  duration: 0.42,
  ease: [0.16, 1, 0.3, 1],
};

export const cardParallelEase: Transition = {
  duration: 0.46,
  ease: [0.16, 1, 0.3, 1],
};

/**
 * Viewport configuration to ensure scroll animations trigger smoothly.
 */
export const viewportOnce = {
  once: true,
  amount: 0.15,
};

/**
 * Stagger container for animating items in structured sequences.
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.02,
    },
  },
};

/**
 * Natural parallel fade-up animation for text and blocks.
 */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothParallelEase,
  },
};

/**
 * Card reveal animation with synchronized parallel opacity + slide-up motion.
 */
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: cardParallelEase,
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
  whileHover: { y: -3 },
  transition: { duration: 0.2, ease: 'easeOut' as const } as Transition,
};
