import type { Variants, Transition } from 'motion/react';

/**
 * Clean, tactile spring and ease curves for a Swiss minimalist aesthetic.
 */
export const softSpring: Transition = {
  type: 'spring',
  damping: 32,
  stiffness: 160,
};

export const gentleSpring: Transition = {
  type: 'spring',
  damping: 28,
  stiffness: 140,
};

export const tactileSpring: Transition = {
  type: 'spring',
  damping: 24,
  stiffness: 280,
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
      staggerChildren: 0.08,
      delayChildren: 0.02,
    },
  },
};

/**
 * Natural fade-up animation for text and blocks.
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
