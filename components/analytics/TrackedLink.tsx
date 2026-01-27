/**
 * Tracked Link Component
 * Feature: TRACK-002 - Acquisition Event Tracking
 *
 * Wraps links with automatic CTA click tracking
 */

'use client';

import Link from 'next/link';
import { trackCTAClick } from '@/lib/analytics/acquisition';
import { ComponentProps } from 'react';

interface TrackedLinkProps extends ComponentProps<typeof Link> {
  ctaLabel: string;
  ctaLocation: string;
  trackingProperties?: Record<string, unknown>;
}

export function TrackedLink({
  ctaLabel,
  ctaLocation,
  trackingProperties,
  onClick,
  ...props
}: TrackedLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Track the CTA click
    trackCTAClick(ctaLabel, ctaLocation, trackingProperties);

    // Call original onClick if provided
    onClick?.(e);
  };

  return <Link {...props} onClick={handleClick} />;
}
