/**
 * PostHog Server Client Configuration
 * Feature: TRACK-001 - Tracking SDK Integration
 *
 * Server-side PostHog client for API route and server-side event tracking
 */

import { PostHog } from 'posthog-node';

let serverPostHogClient: PostHog | null = null;

/**
 * Get or create PostHog server client
 */
export const getServerPostHog = (): PostHog | null => {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    console.warn('[PostHog Server] API key not configured. Server-side analytics disabled.');
    return null;
  }

  if (!serverPostHogClient) {
    serverPostHogClient = new PostHog(apiKey, {
      host: apiHost,
      flushAt: 20, // Flush after 20 events
      flushInterval: 10000, // Or flush every 10 seconds
    });
  }

  return serverPostHogClient;
};

/**
 * Track a server-side event
 */
export const trackServerEvent = (
  distinctId: string,
  eventName: string,
  properties?: Record<string, unknown>
) => {
  const client = getServerPostHog();
  if (!client) return;

  try {
    client.capture({
      distinctId,
      event: eventName,
      properties,
    });
  } catch (error) {
    console.error('[PostHog Server] Error tracking event:', error);
  }
};

/**
 * Identify a user on the server
 */
export const identifyServerUser = (
  distinctId: string,
  properties?: Record<string, unknown>
) => {
  const client = getServerPostHog();
  if (!client) return;

  try {
    client.identify({
      distinctId,
      properties,
    });
  } catch (error) {
    console.error('[PostHog Server] Error identifying user:', error);
  }
};

/**
 * Flush all pending events (call before process exit)
 */
export const flushPostHog = async () => {
  const client = getServerPostHog();
  if (!client) return;

  try {
    await client.shutdown();
  } catch (error) {
    console.error('[PostHog Server] Error flushing events:', error);
  }
};

/**
 * Alias a user (link anonymous ID to identified user ID)
 */
export const aliasUser = (alias: string, distinctId: string) => {
  const client = getServerPostHog();
  if (!client) return;

  try {
    client.alias({
      alias,
      distinctId,
    });
  } catch (error) {
    console.error('[PostHog Server] Error aliasing user:', error);
  }
};
