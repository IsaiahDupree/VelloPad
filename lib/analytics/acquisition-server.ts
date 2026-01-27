/**
 * Acquisition Event Tracking (Server-Side)
 * Feature: TRACK-002 - Acquisition Event Tracking
 *
 * Server-side acquisition tracking for API routes and server components
 */

import { trackServerEvent } from './posthog-server';
import { UTMParams } from './acquisition';

/**
 * Server-side tracking for landing views
 * Used in API routes or server components
 */
export function trackServerLandingView(
  distinctId: string,
  utmParams: UTMParams,
  properties?: Record<string, unknown>
): void {
  trackServerEvent(distinctId, 'landing_view', {
    ...utmParams,
    ...properties,
  });
}

/**
 * Server-side tracking for CTA clicks
 */
export function trackServerCTAClick(
  distinctId: string,
  ctaLabel: string,
  ctaLocation: string,
  utmParams: UTMParams,
  properties?: Record<string, unknown>
): void {
  trackServerEvent(distinctId, 'cta_click', {
    ...utmParams,
    cta_label: ctaLabel,
    cta_location: ctaLocation,
    ...properties,
  });
}
