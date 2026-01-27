/**
 * Analytics Event Tracking Helpers
 * Features: TRACK-002, TRACK-003, TRACK-004, TRACK-005
 *
 * Type-safe event tracking functions for VelloPad
 */

import { trackEvent as phTrackEvent } from './posthog-client';
import { trackServerEvent } from './posthog-server';
import type {
  // Acquisition
  LandingViewProperties,
  CTAClickProperties,
  TemplatePreviewProperties,

  // Activation
  SignupStartProperties,
  SignupCompleteProperties,
  LoginSuccessProperties,
  ActivationCompleteProperties,

  // Core Value
  BookCreatedProperties,
  ChapterWrittenProperties,
  WordCountMilestoneProperties,
  PDFGeneratedProperties,
  CoverDesignedProperties,

  // Monetization
  CheckoutStartedProperties,
  PurchaseCompletedProperties,
  PrintOrderCompletedProperties,
  SubscriptionStartedProperties,

  // Retention
  ReturnSessionProperties,
  WritingStreakProperties,

  // Reliability
  ErrorProperties,
} from './types';

// ============================================================================
// ACQUISITION EVENTS (TRACK-002)
// ============================================================================

export function trackLandingView(properties: LandingViewProperties) {
  phTrackEvent('landing_view', properties);
}

export function trackCTAClick(properties: CTAClickProperties) {
  phTrackEvent('cta_click', properties);
}

export function trackPricingView(utmParams?: Record<string, string>) {
  phTrackEvent('pricing_view', {
    ...utmParams,
    page_url: typeof window !== 'undefined' ? window.location.href : undefined,
  });
}

export function trackTemplatePreview(properties: TemplatePreviewProperties) {
  phTrackEvent('template_preview', properties);
}

// ============================================================================
// ACTIVATION EVENTS (TRACK-003)
// ============================================================================

export function trackSignupStart(properties: SignupStartProperties) {
  phTrackEvent('signup_start', {
    ...properties,
    timestamp: Date.now(),
  });
}

export function trackSignupComplete(properties: SignupCompleteProperties) {
  phTrackEvent('signup_complete', properties);
}

export function trackLoginSuccess(properties: LoginSuccessProperties) {
  phTrackEvent('login_success', properties);
}

export function trackActivationComplete(properties: ActivationCompleteProperties) {
  phTrackEvent('activation_complete', {
    ...properties,
    // Mark this as a key milestone
    is_north_star_metric: true,
  });
}

export function trackFirstBookCreated(bookId: string, title: string) {
  phTrackEvent('first_book_created', {
    book_id: bookId,
    title,
    // This is the "Activated" north star metric
    is_north_star_metric: true,
    milestone: 'activated',
  });
}

// ============================================================================
// CORE VALUE EVENTS (TRACK-004)
// ============================================================================

export function trackBookCreated(properties: BookCreatedProperties) {
  phTrackEvent('book_created', properties);
}

export function trackChapterWritten(properties: ChapterWrittenProperties) {
  phTrackEvent('chapter_written', properties);
}

export function trackWordCountMilestone(properties: WordCountMilestoneProperties) {
  const isFirstValue = properties.milestone === 1000;

  phTrackEvent('word_count_milestone', {
    ...properties,
    // Mark 1000 words as "First Value" north star metric
    is_north_star_metric: isFirstValue,
    milestone_name: isFirstValue ? 'first_value' : undefined,
  });
}

export function trackPDFGenerated(properties: PDFGeneratedProperties) {
  phTrackEvent('pdf_generated', {
    ...properties,
    // This is the "Aha Moment" north star metric
    is_north_star_metric: true,
    milestone: 'aha_moment',
  });
}

export function trackCoverDesigned(properties: CoverDesignedProperties) {
  phTrackEvent('cover_designed', properties);
}

// ============================================================================
// MONETIZATION EVENTS (TRACK-005)
// ============================================================================

export function trackCheckoutStarted(properties: CheckoutStartedProperties) {
  phTrackEvent('checkout_started', properties);
}

export function trackPurchaseCompleted(properties: PurchaseCompletedProperties) {
  phTrackEvent('purchase_completed', properties);
}

export function trackPrintOrderCompleted(properties: PrintOrderCompletedProperties) {
  phTrackEvent('print_order_completed', {
    ...properties,
    // This is the "Monetized" north star metric
    is_north_star_metric: true,
    milestone: 'monetized',
  });
}

export function trackSubscriptionStarted(properties: SubscriptionStartedProperties) {
  phTrackEvent('subscription_started', properties);
}

// ============================================================================
// RETENTION EVENTS (TRACK-006)
// ============================================================================

export function trackReturnSession(properties: ReturnSessionProperties) {
  phTrackEvent('return_session', properties);
}

export function trackWritingStreak(properties: WritingStreakProperties) {
  phTrackEvent('writing_streak', properties);
}

// ============================================================================
// RELIABILITY EVENTS (TRACK-007)
// ============================================================================

export function trackError(properties: ErrorProperties) {
  phTrackEvent('error_shown', {
    ...properties,
    // Errors are important - capture stack trace if available
    error_source: 'client',
  });
}

export function trackPDFGenerationFailed(bookId: string, error: string) {
  phTrackEvent('pdf_generation_failed', {
    book_id: bookId,
    error_message: error,
    error_source: 'pdf_renderer',
  });
}

export function trackPrintOrderFailed(orderId: string, error: string, provider: string) {
  phTrackEvent('print_order_failed', {
    order_id: orderId,
    error_message: error,
    provider,
    error_source: 'print_provider',
  });
}

export function trackAPIError(endpoint: string, statusCode: number, errorMessage: string) {
  phTrackEvent('api_error', {
    endpoint,
    status_code: statusCode,
    error_message: errorMessage,
    error_source: 'api',
  });
}

// ============================================================================
// SERVER-SIDE EVENT TRACKING
// ============================================================================

/**
 * Track events from server-side code (API routes, middleware, etc.)
 */
export function trackServerSideEvent(
  userId: string,
  eventName: string,
  properties?: Record<string, unknown>
) {
  trackServerEvent(userId, eventName, properties);
}

/**
 * Track signup completion from server (after user creation)
 */
export function trackServerSignupComplete(
  userId: string,
  properties: Omit<SignupCompleteProperties, 'user_id'>
) {
  trackServerEvent(userId, 'signup_complete', {
    ...properties,
    user_id: userId,
  });
}

/**
 * Track order completion from server (after payment success)
 */
export function trackServerOrderComplete(
  userId: string,
  properties: Omit<PrintOrderCompletedProperties, 'user_id'>
) {
  trackServerEvent(userId, 'print_order_completed', {
    ...properties,
    user_id: userId,
    is_north_star_metric: true,
    milestone: 'monetized',
  });
}

// ============================================================================
// BATCH TRACKING (for performance)
// ============================================================================

/**
 * Queue events to be sent in batch
 * Useful for high-frequency events like scroll tracking
 */
const eventQueue: Array<{ event: string; properties: Record<string, unknown> }> = [];
let flushTimeout: NodeJS.Timeout | null = null;

export function queueEvent(eventName: string, properties: Record<string, unknown>) {
  eventQueue.push({ event: eventName, properties });

  // Auto-flush after 5 seconds or 10 events
  if (eventQueue.length >= 10) {
    flushEventQueue();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(flushEventQueue, 5000);
  }
}

export function flushEventQueue() {
  if (eventQueue.length === 0) return;

  // Send all queued events
  eventQueue.forEach(({ event, properties }) => {
    phTrackEvent(event, properties);
  });

  // Clear queue
  eventQueue.length = 0;

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushEventQueue);
}
