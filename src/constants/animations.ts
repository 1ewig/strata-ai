import type { Variants, Transition } from 'motion/react';

/**
 * Standard soft spring transition for responsive, calm micro-interactions.
 */
export const softSpring: Transition = {
  type: 'spring',
  damping: 28,
  stiffness: 300,
};

export const gentleSpring: Transition = {
  type: 'spring',
  damping: 32,
  stiffness: 220,
};

/**
 * Jitter-free height collapse & expand animation with pure ease curves and strict overflow containment.
 */
export const accordionVariants: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.12 },
    },
  },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.2, ease: [0, 0, 0.2, 1] },
      opacity: { duration: 0.16, delay: 0.02 },
    },
  },
};

/**
 * Popover and dropdown menu floating animation.
 */
export const popoverVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.96,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 26,
      stiffness: 360,
    },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.96,
    transition: { duration: 0.1, ease: 'easeIn' },
  },
};

/**
 * Floating button pill animation (e.g. Scroll to Bottom).
 */
export const pillFloatVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
    scale: 0.92,
    transition: { duration: 0.14, ease: 'easeIn' },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 24,
      stiffness: 340,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.94,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

/**
 * Thumbnail pop-in / scale-down removal animation for composer attachments.
 */
export const attachmentThumbVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.75,
    y: 4,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 24,
      stiffness: 380,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.75,
    y: 4,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

/**
 * Empty state hero stagger orchestration.
 */
export const heroStaggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.02,
    },
  },
};

export const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 360,
      damping: 26,
    },
  },
};

export const emblemPopVariants: Variants = {
  hidden: { scale: 0.5, opacity: 0, rotate: -10 },
  visible: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 380, damping: 22 },
  },
};

/**
 * Interactive button tap/hover presets.
 */
export const chipHoverProps = {
  whileHover: { scale: 1.035, y: -1.5 },
  whileTap: { scale: 0.96 },
  transition: { duration: 0.12 } as Transition,
};

export const buttonTapProps = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.95 },
  transition: { duration: 0.12 } as Transition,
};
