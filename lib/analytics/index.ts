/**
 * Analytics Module - Client-Side Exports
 * Features: TRACK-001, TRACK-002, TRACK-003, TRACK-004, TRACK-005, TRACK-008
 *
 * This file only exports client-side analytics functions to avoid
 * bundling server-side dependencies in client code.
 *
 * For server-side analytics, import from './posthog-server' or './acquisition-server' directly.
 */

// Browser-side exports
export {
  initializePostHog,
  getPostHog,
  identifyUser,
  trackEvent,
  resetPostHog,
  setUserProperties,
  trackPageView,
} from './posthog-client';

// React hooks
export {
  useIdentifyUser,
  useTrackEvent,
  useUpdateUserProperties,
  useTrackPageView,
} from './hooks';

// Acquisition tracking (TRACK-002) - Client-side only
export * from './acquisition';

// Re-export types (safe for client and server)
export type * from './types';
