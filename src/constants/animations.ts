import { Variants, Transition } from 'framer-motion';

/**
 * Shared Framer Motion animation variants and transitions.
 * Extracted from App.tsx, Dashboard.tsx, TaskList.tsx, and FilterBar.tsx
 * to ensure consistent animation patterns across the app.
 */

// ====== Spring Configurations ======

/**
 * Standard spring transition used throughout the app.
 * Provides a snappy, responsive feel without being too bouncy.
 */
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
};

/**
 * Slower spring for larger elements or page transitions.
 */
export const springTransitionSlow: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};

/**
 * Faster spring for small interactions like button hovers.
 */
export const springTransitionFast: Transition = {
  type: 'spring',
  stiffness: 600,
  damping: 40,
};

// ====== Container Variants (Stagger Children) ======

/**
 * Standard stagger container for lists and grids.
 * Used in App.tsx main content.
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

/**
 * Faster stagger for task lists and dashboard sections.
 * Used in Dashboard.tsx and TaskList.tsx.
 */
export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

/**
 * Ultra-fast stagger for dashboard focused tasks.
 */
export const staggerContainerUltraFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

// ====== Item Variants (Children of Stagger Containers) ======

/**
 * Standard fade-in-up animation for list items.
 * Used in App.tsx for main sections (y: 16).
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

/**
 * Smaller fade-in-up for compact list items.
 * Used in TaskList.tsx and Dashboard.tsx (y: 12).
 */
export const fadeInUpSmall: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

/**
 * Simple fade-in animation (no vertical movement).
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.1 },
  },
};

/**
 * Fade-in with slight scale for empty states and icons.
 */
export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// ====== Individual Element Animations ======

/**
 * Slide up from bottom (for headers, banners).
 */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
};

/**
 * Slide in from right (for actions, buttons).
 */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2 },
  },
};

/**
 * Icon bounce-in animation for empty states.
 */
export const iconBounceIn: Variants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: {
      delay: 0.1,
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
};

/**
 * Collapse/expand animation for height-based transitions.
 */
export const collapseExpand: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.2 },
  },
};

// ====== Interaction Animations ======

/**
 * Hover scale up (subtle).
 */
export const hoverScale = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
};

/**
 * Hover scale up (medium).
 */
export const hoverScaleMedium = {
  whileHover: { scale: 1.1 },
  whileTap: { scale: 0.9 },
};

/**
 * Hover scale up (large, for buttons).
 */
export const hoverScaleLarge = {
  whileHover: { scale: 1.15 },
  whileTap: { scale: 0.85 },
};

// ====== Transition Presets ======

/**
 * Quick fade transition for tab switching.
 */
export const quickFade: Transition = {
  duration: 0.1,
};

/**
 * Smooth fade transition for modal overlays.
 */
export const smoothFade: Transition = {
  duration: 0.3,
  ease: 'easeOut',
};

/**
 * Delayed fade-in for empty states.
 */
export const delayedFadeIn: Transition = {
  delay: 0.2,
  duration: 0.4,
};
