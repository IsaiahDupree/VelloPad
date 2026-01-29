/**
 * Person Features Computation
 * Feature: GDP-011
 *
 * Computes behavioral engagement features for persons from their event history
 * Features are used for segmentation, targeting, and personalization
 */

import { createClient } from '@/lib/supabase/server';

export interface PersonFeatures {
  person_id: string;

  // Activity metrics
  active_days_7d: number;
  active_days_30d: number;
  active_days_90d: number;

  // Event counts
  total_events: number;
  events_7d: number;
  events_30d: number;

  // Core action counts (VelloPad-specific)
  books_created: number;
  chapters_written: number;
  words_written: number;
  pdfs_generated: number;
  orders_placed: number;

  // Engagement indicators
  pricing_views: number;
  template_previews: number;

  // Email engagement
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  email_open_rate: number | null;
  email_click_rate: number | null;

  // Subscription metrics
  is_subscriber: boolean;
  subscription_mrr_cents: number | null;

  // Revenue metrics
  total_revenue_cents: number;
  first_purchase_at: string | null;
  last_purchase_at: string | null;

  // Computed scores (0-100)
  engagement_score: number;
  activation_score: number;
  churn_risk_score: number;

  // Last activity
  last_active_at: string | null;

  // Computed timestamp
  computed_at: string;
}

/**
 * Compute person features for a specific person
 * Calls the database function to aggregate event data and compute metrics
 */
export async function computePersonFeatures(personId: string): Promise<void> {
  const supabase = await createClient();

  // Call database function to compute features
  const { error } = await supabase.rpc('compute_person_features', {
    p_person_id: personId,
  });

  if (error) {
    console.error('[PersonFeatures] Failed to compute features:', error);
    throw new Error(`Failed to compute person features: ${error.message}`);
  }
}

/**
 * Get computed features for a person
 */
export async function getPersonFeatures(
  personId: string
): Promise<PersonFeatures | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('person_features')
    .select('*')
    .eq('person_id', personId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No features found - need to compute first
      return null;
    }
    console.error('[PersonFeatures] Failed to get features:', error);
    throw new Error(`Failed to get person features: ${error.message}`);
  }

  return data;
}

/**
 * Compute features if they don't exist or are stale (>24h old)
 */
export async function ensureFreshFeatures(personId: string): Promise<void> {
  const features = await getPersonFeatures(personId);

  const isStale =
    !features ||
    new Date().getTime() - new Date(features.computed_at).getTime() >
      24 * 60 * 60 * 1000;

  if (isStale) {
    await computePersonFeatures(personId);
  }
}

/**
 * Batch compute features for multiple persons
 * Useful for bulk operations or nightly jobs
 */
export async function batchComputePersonFeatures(
  personIds: string[]
): Promise<{
  success: string[];
  failed: Array<{ personId: string; error: string }>;
}> {
  const success: string[] = [];
  const failed: Array<{ personId: string; error: string }> = [];

  for (const personId of personIds) {
    try {
      await computePersonFeatures(personId);
      success.push(personId);
    } catch (error: any) {
      failed.push({
        personId,
        error: error.message,
      });
    }
  }

  return { success, failed };
}

/**
 * Compute features for all persons who had activity in the last N days
 * This is typically run as a cron job
 */
export async function computeFeaturesForRecentlyActive(
  days: number = 30
): Promise<number> {
  const supabase = await createClient();

  // Get all persons with recent activity
  const { data: persons, error } = await supabase
    .from('person')
    .select('id')
    .gte('last_seen_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error('[PersonFeatures] Failed to get recently active persons:', error);
    throw new Error(`Failed to get recently active persons: ${error.message}`);
  }

  if (!persons || persons.length === 0) {
    return 0;
  }

  const { success } = await batchComputePersonFeatures(persons.map((p) => p.id));

  console.log(`[PersonFeatures] Computed features for ${success.length} persons`);

  return success.length;
}

/**
 * Get engagement segment for a person based on their features
 */
export function getEngagementSegment(features: PersonFeatures): string {
  if (features.engagement_score >= 70) {
    return 'high_engagement';
  } else if (features.engagement_score >= 40) {
    return 'medium_engagement';
  } else if (features.engagement_score >= 10) {
    return 'low_engagement';
  } else {
    return 'inactive';
  }
}

/**
 * Get activation status based on features
 */
export function getActivationStatus(features: PersonFeatures): {
  status: 'not_activated' | 'partially_activated' | 'fully_activated';
  nextStep: string | null;
} {
  // Fully activated: created book, wrote words, generated PDF
  if (
    features.books_created > 0 &&
    features.words_written >= 300 &&
    features.pdfs_generated > 0
  ) {
    return {
      status: 'fully_activated',
      nextStep: null,
    };
  }

  // Partially activated: created book and wrote some words
  if (features.books_created > 0 && features.words_written > 0) {
    return {
      status: 'partially_activated',
      nextStep: 'Generate your first PDF preview',
    };
  }

  // Created book but no words
  if (features.books_created > 0) {
    return {
      status: 'partially_activated',
      nextStep: 'Write your first 300 words',
    };
  }

  // Not activated
  return {
    status: 'not_activated',
    nextStep: 'Create your first book',
  };
}

/**
 * Check if person is at risk of churning
 */
export function isAtRiskOfChurn(features: PersonFeatures): boolean {
  // High churn risk if:
  // - Is a subscriber
  // - Low recent activity (< 2 active days in last 30 days)
  // - Low engagement score
  if (
    features.is_subscriber &&
    features.active_days_30d < 2 &&
    features.engagement_score < 30
  ) {
    return true;
  }

  // Or has high computed churn risk score
  if (features.churn_risk_score >= 60) {
    return true;
  }

  return false;
}

/**
 * Get personalized recommendations based on features
 */
export function getRecommendations(features: PersonFeatures): string[] {
  const recommendations: string[] = [];

  // Writing recommendations
  if (features.books_created > 0 && features.words_written < 1000) {
    recommendations.push('Set a daily writing goal to build momentum');
  }

  if (features.words_written >= 10000 && features.pdfs_generated === 0) {
    recommendations.push('Generate a PDF preview to see your book come to life');
  }

  // Ordering recommendations
  if (features.pdfs_generated > 0 && features.orders_placed === 0) {
    recommendations.push('Order a proof copy to see your book in print');
  }

  // Engagement recommendations
  if (features.active_days_30d < 7 && features.books_created > 0) {
    recommendations.push('Try writing for 15 minutes daily to stay on track');
  }

  // Template recommendations
  if (features.books_created === 0 && features.template_previews > 0) {
    recommendations.push('You viewed templates - create your first book to try them out');
  }

  // Subscription recommendations
  if (
    !features.is_subscriber &&
    features.books_created >= 2 &&
    features.words_written >= 5000
  ) {
    recommendations.push(
      'Unlock premium templates and features with a subscription'
    );
  }

  return recommendations;
}
