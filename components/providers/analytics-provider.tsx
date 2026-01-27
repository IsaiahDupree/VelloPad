/**
 * Analytics Provider
 * Feature: TRACK-001 - Tracking SDK Integration
 *
 * Initializes PostHog and provides analytics context to the app
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initializePostHog, getPostHog, trackPageView as phTrackPageView } from '@/lib/analytics';
import type { PostHog } from 'posthog-js';

interface AnalyticsContextValue {
  posthog: PostHog | null;
  isInitialized: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue>({
  posthog: null,
  isInitialized: false,
});

export const useAnalytics = () => useContext(AnalyticsContext);

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [posthog, setPosthog] = useState<PostHog | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize PostHog on mount
  useEffect(() => {
    const client = initializePostHog();
    setPosthog(client);
    setIsInitialized(!!client);
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (!isInitialized) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    phTrackPageView(pathname, {
      url,
      referrer: document.referrer,
    });
  }, [pathname, searchParams, isInitialized]);

  return (
    <AnalyticsContext.Provider value={{ posthog, isInitialized }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
