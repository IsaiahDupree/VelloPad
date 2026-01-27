/**
 * PostHog Client Configuration
 * Feature: TRACK-001 - Tracking SDK Integration
 *
 * Browser-side PostHog client for client-side event tracking
 */

import posthog from 'posthog-js';

export const initializePostHog = () => {
  // Only initialize in browser environment
  if (typeof window === 'undefined') {
    return null;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    console.warn('[PostHog] API key not configured. Analytics will be disabled.');
    return null;
  }

  try {
    posthog.init(apiKey, {
      api_host: apiHost,
      person_profiles: 'identified_only',

      // Capture settings
      capture_pageview: false, // We'll manually capture pageviews
      capture_pageleave: true,

      // Privacy settings
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true, // Mask all input fields by default
        maskTextSelector: '[data-private]', // Mask elements with data-private attribute
      },

      // Performance
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PostHog] Initialized successfully');
        }
      },

      // Advanced features
      autocapture: {
        dom_event_allowlist: ['click', 'submit'], // Only capture clicks and form submits
        url_allowlist: [window.location.origin], // Only capture on our domain
        element_allowlist: ['button', 'a'], // Only capture specific elements
      },
    });

    return posthog;
  } catch (error) {
    console.error('[PostHog] Initialization error:', error);
    return null;
  }
};

/**
 * Get PostHog client instance
 */
export const getPostHog = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return posthog;
};

/**
 * Identify a user in PostHog
 */
export const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
  const client = getPostHog();
  if (!client) return;

  client.identify(userId, properties);
};

/**
 * Track a custom event
 */
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  const client = getPostHog();
  if (!client) return;

  client.capture(eventName, properties);
};

/**
 * Reset PostHog (on logout)
 */
export const resetPostHog = () => {
  const client = getPostHog();
  if (!client) return;

  client.reset();
};

/**
 * Set user properties
 */
export const setUserProperties = (properties: Record<string, unknown>) => {
  const client = getPostHog();
  if (!client) return;

  client.people.set(properties);
};

/**
 * Track a page view
 */
export const trackPageView = (pageName?: string, properties?: Record<string, unknown>) => {
  const client = getPostHog();
  if (!client) return;

  client.capture('$pageview', {
    $current_url: window.location.href,
    $pathname: window.location.pathname,
    page_name: pageName,
    ...properties,
  });
};
