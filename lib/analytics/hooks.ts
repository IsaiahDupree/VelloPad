/**
 * Analytics Hooks
 * Features: TRACK-008 - User Identification
 *
 * React hooks for analytics tracking
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useAnalytics } from '@/components/providers/analytics-provider';
import { identifyUser, resetPostHog, setUserProperties } from './posthog-client';
import type { User } from '@supabase/supabase-js';

/**
 * Hook to identify user in PostHog
 * Feature: TRACK-008
 *
 * Automatically identifies the user when they log in
 */
export function useIdentifyUser(user: User | null) {
  const { isInitialized } = useAnalytics();

  useEffect(() => {
    if (!isInitialized) return;

    if (user) {
      // Identify user with PostHog
      identifyUser(user.id, {
        email: user.email,
        created_at: user.created_at,
        email_confirmed: !!user.email_confirmed_at,
        last_sign_in: user.last_sign_in_at,
        // Add any other user metadata
        user_metadata: user.user_metadata,
      });

      // Set additional user properties if available
      if (user.user_metadata) {
        setUserProperties({
          full_name: user.user_metadata.full_name,
          avatar_url: user.user_metadata.avatar_url,
        });
      }
    } else {
      // User logged out - reset PostHog
      resetPostHog();
    }
  }, [user, isInitialized]);
}

/**
 * Hook to track events with analytics
 */
export function useTrackEvent() {
  const { posthog, isInitialized } = useAnalytics();

  const track = useCallback(
    (eventName: string, properties?: Record<string, unknown>) => {
      if (!isInitialized || !posthog) return;

      posthog.capture(eventName, properties);
    },
    [posthog, isInitialized]
  );

  return track;
}

/**
 * Hook to update user properties
 */
export function useUpdateUserProperties() {
  const { isInitialized } = useAnalytics();

  const updateProperties = useCallback(
    (properties: Record<string, unknown>) => {
      if (!isInitialized) return;

      setUserProperties(properties);
    },
    [isInitialized]
  );

  return updateProperties;
}

/**
 * Hook to track page views manually
 * Note: Automatic page tracking is handled by AnalyticsProvider
 */
export function useTrackPageView() {
  const { posthog, isInitialized } = useAnalytics();

  const trackPageView = useCallback(
    (pageName?: string, properties?: Record<string, unknown>) => {
      if (!isInitialized || !posthog) return;

      posthog.capture('$pageview', {
        $current_url: window.location.href,
        $pathname: window.location.pathname,
        page_name: pageName,
        ...properties,
      });
    },
    [posthog, isInitialized]
  );

  return trackPageView;
}
