/**
 * Client-side Event Tracking
 * Feature: BS-701
 *
 * React hook and utilities for tracking events from the browser
 */

'use client';

import { useCallback } from 'react';
import type { EventName, EventCategory, EventProperties } from './index';

// ============================================================================
// CLIENT-SIDE EVENT TRACKING
// ============================================================================

interface TrackEventClientOptions {
  workspaceId?: string;
  bookId?: string;
  orderId?: string;
  eventName: EventName;
  eventCategory: EventCategory;
  properties?: EventProperties;
  sessionId?: string;
}

/**
 * Track an event from the client
 */
export async function trackEventClient(options: TrackEventClientOptions): Promise<boolean> {
  try {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      console.error('Failed to track event:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error tracking event:', error);
    return false;
  }
}

/**
 * Track multiple events from the client
 */
export async function trackEventBatchClient(events: TrackEventClientOptions[]): Promise<boolean> {
  try {
    const response = await fetch('/api/events/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      console.error('Failed to track batch events:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error tracking batch events:', error);
    return false;
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook for tracking events
 *
 * @example
 * const { track, trackPageView } = useTracking();
 *
 * // Track custom event
 * track('book_created', 'book', { book_title: 'My Book' });
 *
 * // Track page view
 * trackPageView('/books/123');
 */
export function useTracking() {
  const track = useCallback(
    async (
      eventName: EventName,
      eventCategory: EventCategory,
      properties?: EventProperties,
      context?: {
        workspaceId?: string;
        bookId?: string;
        orderId?: string;
      }
    ) => {
      return trackEventClient({
        eventName,
        eventCategory,
        properties,
        ...context,
      });
    },
    []
  );

  const trackPageView = useCallback(
    async (page: string, properties?: EventProperties) => {
      return trackEventClient({
        eventName: 'page_viewed',
        eventCategory: 'engagement',
        properties: {
          page,
          ...properties,
        },
      });
    },
    []
  );

  const trackBookCreated = useCallback(
    async (bookId: string, workspaceId: string, properties?: EventProperties) => {
      return trackEventClient({
        bookId,
        workspaceId,
        eventName: 'book_created',
        eventCategory: 'book',
        properties,
      });
    },
    []
  );

  const trackCheckoutStarted = useCallback(
    async (bookId: string, workspaceId: string, properties?: EventProperties) => {
      return trackEventClient({
        bookId,
        workspaceId,
        eventName: 'checkout_started',
        eventCategory: 'commerce',
        properties,
      });
    },
    []
  );

  const trackCheckoutCompleted = useCallback(
    async (orderId: string, bookId: string, workspaceId: string, properties?: EventProperties) => {
      return trackEventClient({
        orderId,
        bookId,
        workspaceId,
        eventName: 'checkout_completed',
        eventCategory: 'commerce',
        properties,
      });
    },
    []
  );

  return {
    track,
    trackPageView,
    trackBookCreated,
    trackCheckoutStarted,
    trackCheckoutCompleted,
  };
}

// ============================================================================
// SESSION TRACKING
// ============================================================================

/**
 * Generate a session ID for tracking user sessions
 */
export function generateSessionId(): string {
  if (typeof window === 'undefined') return '';

  const sessionKey = 'vellopad_session_id';
  let sessionId = sessionStorage.getItem(sessionKey);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(sessionKey, sessionId);
  }

  return sessionId;
}

/**
 * Get or create session ID
 */
export function getSessionId(): string {
  return generateSessionId();
}
