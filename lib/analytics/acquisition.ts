/**
 * Acquisition Event Tracking (Client-Side)
 * Feature: TRACK-002 - Acquisition Event Tracking
 *
 * Track landing_view, cta_click, pricing_view with UTM parameters
 */

import { trackEvent } from './posthog-client';

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

/**
 * Extract UTM parameters from URL search params
 */
export function extractUTMParams(searchParams: URLSearchParams): UTMParams {
  return {
    utm_source: searchParams.get('utm_source') || undefined,
    utm_medium: searchParams.get('utm_medium') || undefined,
    utm_campaign: searchParams.get('utm_campaign') || undefined,
    utm_term: searchParams.get('utm_term') || undefined,
    utm_content: searchParams.get('utm_content') || undefined,
  };
}

/**
 * Extract UTM parameters from current URL (client-side)
 */
export function getCurrentUTMParams(): UTMParams {
  if (typeof window === 'undefined') {
    return {};
  }

  const searchParams = new URLSearchParams(window.location.search);
  return extractUTMParams(searchParams);
}

/**
 * Store UTM parameters in session storage for attribution
 */
export function storeUTMParams(params: UTMParams): void {
  if (typeof window === 'undefined') return;

  // Only store if we have at least one UTM parameter
  const hasUTM = Object.values(params).some(v => v !== undefined);
  if (!hasUTM) return;

  try {
    sessionStorage.setItem('vellopad_utm', JSON.stringify(params));
  } catch (error) {
    console.error('[Acquisition] Error storing UTM params:', error);
  }
}

/**
 * Retrieve stored UTM parameters from session storage
 */
export function getStoredUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};

  try {
    const stored = sessionStorage.getItem('vellopad_utm');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('[Acquisition] Error retrieving UTM params:', error);
    return {};
  }
}

/**
 * Track landing page view with UTM parameters
 */
export function trackLandingView(properties?: Record<string, unknown>): void {
  const utmParams = getCurrentUTMParams();

  // Store UTM params for later attribution
  storeUTMParams(utmParams);

  trackEvent('landing_view', {
    ...utmParams,
    page: window.location.pathname,
    url: window.location.href,
    referrer: document.referrer,
    ...properties,
  });
}

/**
 * Track CTA click with UTM attribution
 */
export function trackCTAClick(
  ctaLabel: string,
  ctaLocation: string,
  properties?: Record<string, unknown>
): void {
  const utmParams = getStoredUTMParams();

  trackEvent('cta_click', {
    ...utmParams,
    cta_label: ctaLabel,
    cta_location: ctaLocation,
    page: window.location.pathname,
    url: window.location.href,
    ...properties,
  });
}

/**
 * Track pricing page view with UTM attribution
 */
export function trackPricingView(properties?: Record<string, unknown>): void {
  const utmParams = getStoredUTMParams();

  trackEvent('pricing_view', {
    ...utmParams,
    page: window.location.pathname,
    url: window.location.href,
    referrer: document.referrer,
    ...properties,
  });
}

/**
 * Track feature section view
 */
export function trackFeatureView(
  featureName: string,
  properties?: Record<string, unknown>
): void {
  const utmParams = getStoredUTMParams();

  trackEvent('feature_view', {
    ...utmParams,
    feature_name: featureName,
    page: window.location.pathname,
    ...properties,
  });
}

/**
 * Track external link click
 */
export function trackExternalLinkClick(
  linkUrl: string,
  linkText: string,
  properties?: Record<string, unknown>
): void {
  trackEvent('external_link_click', {
    link_url: linkUrl,
    link_text: linkText,
    page: window.location.pathname,
    ...properties,
  });
}
