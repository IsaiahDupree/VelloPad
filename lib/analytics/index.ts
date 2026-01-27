/**
 * Analytics Module - Central export point
 * Features: TRACK-001, TRACK-002, TRACK-003, TRACK-004, TRACK-005, TRACK-008
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

// Server-side exports
export {
  getServerPostHog,
  trackServerEvent,
  identifyServerUser,
  flushPostHog,
  aliasUser,
} from './posthog-server';

// React hooks
export {
  useIdentifyUser,
  useTrackEvent,
  useUpdateUserProperties,
  useTrackPageView,
} from './hooks';

// Type-safe event tracking functions
export * from './events';

// Event types and utilities
export * from './types';
