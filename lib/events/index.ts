/**
 * Event Collection Pipeline
 * Feature: BS-701
 *
 * Product analytics events stored in Supabase and optionally forwarded to:
 * - PostHog (for product analytics)
 * - Mixpanel (for user behavior)
 * - Amplitude (for growth analytics)
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// EVENT TYPES
// ============================================================================

export type EventCategory =
  | 'auth'
  | 'book'
  | 'chapter'
  | 'asset'
  | 'template'
  | 'cover'
  | 'rendition'
  | 'commerce'
  | 'order'
  | 'settings'
  | 'workspace'
  | 'engagement';

export type EventName =
  // Auth events
  | 'user_signed_up'
  | 'user_logged_in'
  | 'user_logged_out'

  // Book events
  | 'book_created'
  | 'book_updated'
  | 'book_deleted'
  | 'book_milestone_reached' // 1000, 5000, 10000 words, etc.

  // Chapter events
  | 'chapter_created'
  | 'chapter_updated'
  | 'chapter_deleted'
  | 'chapter_reordered'

  // Asset events
  | 'asset_uploaded'
  | 'asset_deleted'
  | 'asset_quality_warning'

  // Template events
  | 'template_viewed'
  | 'template_applied'

  // Cover events
  | 'cover_designed'
  | 'cover_updated'

  // Rendition events
  | 'rendition_requested'
  | 'rendition_started'
  | 'rendition_completed'
  | 'rendition_failed'
  | 'preview_generated'

  // Commerce events
  | 'quote_requested'
  | 'quote_received'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_abandoned'

  // Order events
  | 'order_created'
  | 'order_paid'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'reorder_requested'

  // Settings events
  | 'profile_updated'
  | 'workspace_created'
  | 'workspace_updated'
  | 'member_invited'
  | 'member_removed'

  // Engagement events
  | 'page_viewed'
  | 'feature_discovered'
  | 'help_viewed'
  | 'feedback_submitted';

export interface EventProperties {
  // Flexible properties object
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown>;
}

export interface TrackEventOptions {
  userId?: string;
  workspaceId?: string;
  bookId?: string;
  orderId?: string;
  eventName: EventName;
  eventCategory: EventCategory;
  properties?: EventProperties;

  // Optional user context
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  sessionId?: string;
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

/**
 * Track an event in the database
 */
export async function trackEvent(options: TrackEventOptions): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current user if not provided
    let userId = options.userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    // Insert event
    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id: userId,
        workspace_id: options.workspaceId,
        book_id: options.bookId,
        order_id: options.orderId,
        event_name: options.eventName,
        event_category: options.eventCategory,
        properties: options.properties || {},
        user_agent: options.userAgent,
        ip_address: options.ipAddress,
        referrer: options.referrer,
        session_id: options.sessionId,
        event_timestamp: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error tracking event:', error);
      return { success: false, error: error.message };
    }

    // Optionally forward to external analytics platforms
    // await forwardToPostHog(options);
    // await forwardToMixpanel(options);

    return { success: true, eventId: data.id };
  } catch (error) {
    console.error('Error in trackEvent:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Track multiple events in a batch
 */
export async function trackEventBatch(events: TrackEventOptions[]): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = await createClient();

    const eventRecords = events.map(event => ({
      user_id: event.userId,
      workspace_id: event.workspaceId,
      book_id: event.bookId,
      order_id: event.orderId,
      event_name: event.eventName,
      event_category: event.eventCategory,
      properties: event.properties || {},
      user_agent: event.userAgent,
      ip_address: event.ipAddress,
      referrer: event.referrer,
      session_id: event.sessionId,
      event_timestamp: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('events')
      .insert(eventRecords)
      .select('id');

    if (error) {
      console.error('Error tracking batch events:', error);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error('Error in trackEventBatch:', error);
    return { success: false, count: 0, error: String(error) };
  }
}

// ============================================================================
// EVENT QUERIES
// ============================================================================

export interface GetEventsOptions {
  workspaceId?: string;
  userId?: string;
  bookId?: string;
  orderId?: string;
  eventName?: EventName;
  eventCategory?: EventCategory;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Get events with filtering
 */
export async function getEvents(options: GetEventsOptions = {}) {
  const supabase = await createClient();

  let query = supabase
    .from('events')
    .select('*')
    .order('event_timestamp', { ascending: false });

  if (options.workspaceId) {
    query = query.eq('workspace_id', options.workspaceId);
  }

  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }

  if (options.bookId) {
    query = query.eq('book_id', options.bookId);
  }

  if (options.orderId) {
    query = query.eq('order_id', options.orderId);
  }

  if (options.eventName) {
    query = query.eq('event_name', options.eventName);
  }

  if (options.eventCategory) {
    query = query.eq('event_category', options.eventCategory);
  }

  if (options.startDate) {
    query = query.gte('event_timestamp', options.startDate.toISOString());
  }

  if (options.endDate) {
    query = query.lte('event_timestamp', options.endDate.toISOString());
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error getting events:', error);
    return { events: [], error: error.message };
  }

  return { events: data || [], error: null };
}

/**
 * Get event statistics for a workspace
 */
export async function getWorkspaceEventStats(workspaceId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('get_workspace_event_stats', { p_workspace_id: workspaceId });

  if (error) {
    console.error('Error getting workspace event stats:', error);
    return { stats: [], error: error.message };
  }

  return { stats: data || [], error: null };
}

/**
 * Get user engagement score
 */
export async function getUserEngagementScore(userId: string, days: number = 30) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('get_user_engagement_score', {
      p_user_id: userId,
      p_days: days,
    });

  if (error) {
    console.error('Error getting user engagement score:', error);
    return { score: 0, error: error.message };
  }

  return { score: data || 0, error: null };
}

// ============================================================================
// CONVENIENCE TRACKING FUNCTIONS
// ============================================================================

/**
 * Track a book milestone (word count thresholds)
 */
export async function trackBookMilestone(bookId: string, wordCount: number, milestone: string) {
  return trackEvent({
    bookId,
    eventName: 'book_milestone_reached',
    eventCategory: 'book',
    properties: {
      word_count: wordCount,
      milestone,
    },
  });
}

/**
 * Track checkout abandonment
 */
export async function trackCheckoutAbandonment(workspaceId: string, bookId: string, step: string) {
  return trackEvent({
    workspaceId,
    bookId,
    eventName: 'checkout_abandoned',
    eventCategory: 'commerce',
    properties: {
      abandoned_at_step: step,
    },
  });
}

/**
 * Track page view
 */
export async function trackPageView(page: string, properties?: EventProperties) {
  return trackEvent({
    eventName: 'page_viewed',
    eventCategory: 'engagement',
    properties: {
      page,
      ...properties,
    },
  });
}

// ============================================================================
// EXTERNAL ANALYTICS FORWARDING (Optional)
// ============================================================================

/**
 * Forward event to PostHog (if configured)
 */
async function forwardToPostHog(options: TrackEventOptions) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return; // Not configured
  }

  try {
    // PostHog forwarding logic
    // const posthog = require('posthog-node');
    // client.capture({
    //   distinctId: options.userId,
    //   event: options.eventName,
    //   properties: options.properties,
    // });
  } catch (error) {
    console.error('Error forwarding to PostHog:', error);
  }
}

/**
 * Forward event to Mixpanel (if configured)
 */
async function forwardToMixpanel(options: TrackEventOptions) {
  if (!process.env.MIXPANEL_TOKEN) {
    return; // Not configured
  }

  try {
    // Mixpanel forwarding logic
    // const Mixpanel = require('mixpanel');
    // mixpanel.track(options.eventName, {
    //   distinct_id: options.userId,
    //   ...options.properties,
    // });
  } catch (error) {
    console.error('Error forwarding to Mixpanel:', error);
  }
}

// ============================================================================
// EVENT CLEANUP
// ============================================================================

/**
 * Delete old events (for GDPR compliance and database maintenance)
 * Should be run as a cron job
 */
export async function cleanupOldEvents(daysToKeep: number = 365) {
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const { error, count } = await supabase
    .from('events')
    .delete()
    .lt('event_timestamp', cutoffDate.toISOString());

  if (error) {
    console.error('Error cleaning up old events:', error);
    return { success: false, deletedCount: 0, error: error.message };
  }

  return { success: true, deletedCount: count || 0, error: null };
}
