/**
 * Tracked Button Component
 * Feature: TRACK-002 - Acquisition Event Tracking
 *
 * Wraps buttons with automatic CTA click tracking
 */

'use client';

import { Button } from '@/components/ui/button';
import { trackCTAClick } from '@/lib/analytics/acquisition';
import { ComponentProps } from 'react';

interface TrackedButtonProps extends ComponentProps<typeof Button> {
  ctaLabel: string;
  ctaLocation: string;
  trackingProperties?: Record<string, unknown>;
}

export function TrackedButton({
  ctaLabel,
  ctaLocation,
  trackingProperties,
  onClick,
  ...props
}: TrackedButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Track the CTA click
    trackCTAClick(ctaLabel, ctaLocation, trackingProperties);

    // Call original onClick if provided
    onClick?.(e);
  };

  return <Button {...props} onClick={handleClick} />;
}
