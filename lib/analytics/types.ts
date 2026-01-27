/**
 * Analytics Types
 * Feature: TRACK-001, TRACK-002, TRACK-003, TRACK-004, TRACK-005
 *
 * Type definitions for VelloPad analytics events
 */

// ============================================================================
// EVENT CATEGORIES
// ============================================================================

export type EventCategory =
  | 'acquisition'
  | 'activation'
  | 'core_value'
  | 'monetization'
  | 'retention'
  | 'reliability';

// ============================================================================
// BASE TYPE FOR ALL EVENT PROPERTIES
// ============================================================================

export interface BaseEventProperties {
  [key: string]: unknown;
}

// ============================================================================
// ACQUISITION EVENTS (TRACK-002)
// ============================================================================

export type AcquisitionEvent =
  | 'landing_view'
  | 'cta_click'
  | 'pricing_view'
  | 'template_preview';

export interface LandingViewProperties extends BaseEventProperties {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_page: string;
}

export interface CTAClickProperties extends BaseEventProperties {
  cta_text: string;
  cta_location: string;
  cta_type: 'primary' | 'secondary' | 'tertiary';
  destination_url: string;
}

export interface TemplatePreviewProperties extends BaseEventProperties {
  template_id: string;
  template_name: string;
  template_category: string;
}

// ============================================================================
// ACTIVATION EVENTS (TRACK-003)
// ============================================================================

export type ActivationEvent =
  | 'signup_start'
  | 'signup_complete'
  | 'login_success'
  | 'activation_complete'
  | 'first_book_created';

export interface SignupStartProperties extends BaseEventProperties {
  signup_method: 'email' | 'google' | 'github';
  utm_source?: string;
  utm_campaign?: string;
}

export interface SignupCompleteProperties extends BaseEventProperties {
  user_id: string;
  signup_method: 'email' | 'google' | 'github';
  time_to_complete_seconds: number;
}

export interface LoginSuccessProperties extends BaseEventProperties {
  user_id: string;
  login_method: 'email' | 'google' | 'github';
  is_returning_user: boolean;
}

export interface ActivationCompleteProperties extends BaseEventProperties {
  user_id: string;
  time_to_activation_minutes: number;
  completed_actions: string[];
}

// ============================================================================
// CORE VALUE EVENTS (TRACK-004)
// ============================================================================

export type CoreValueEvent =
  | 'book_created'
  | 'chapter_written'
  | 'word_count_milestone'
  | 'pdf_generated'
  | 'cover_designed'
  | 'order_placed';

export interface BookCreatedProperties extends BaseEventProperties {
  book_id: string;
  title: string;
  template_id?: string;
  template_name?: string;
  target_word_count?: number;
  genre?: string;
}

export interface ChapterWrittenProperties extends BaseEventProperties {
  book_id: string;
  chapter_id: string;
  word_count: number;
  time_spent_seconds: number;
}

export interface WordCountMilestoneProperties extends BaseEventProperties {
  book_id: string;
  milestone: 100 | 300 | 1000 | 5000 | 10000 | 25000 | 50000;
  current_word_count: number;
  days_writing: number;
}

export interface PDFGeneratedProperties extends BaseEventProperties {
  book_id: string;
  rendition_id: string;
  page_count: number;
  file_size_mb: number;
  generation_time_seconds: number;
}

export interface CoverDesignedProperties extends BaseEventProperties {
  book_id: string;
  cover_template?: string;
  is_custom: boolean;
}

// ============================================================================
// MONETIZATION EVENTS (TRACK-005)
// ============================================================================

export type MonetizationEvent =
  | 'checkout_started'
  | 'purchase_completed'
  | 'print_order_completed'
  | 'subscription_started';

export interface CheckoutStartedProperties extends BaseEventProperties {
  book_id: string;
  order_id: string;
  quantity: number;
  format: 'paperback' | 'hardcover';
  total_value: number;
  currency: string;
}

export interface PurchaseCompletedProperties extends BaseEventProperties {
  order_id: string;
  book_id: string;
  quantity: number;
  format: 'paperback' | 'hardcover';
  total_value: number;
  currency: string;
  payment_method: string;
}

export interface PrintOrderCompletedProperties extends BaseEventProperties {
  order_id: string;
  book_id: string;
  provider: string;
  quantity: number;
  total_value: number;
  currency: string;
}

export interface SubscriptionStartedProperties extends BaseEventProperties {
  plan: 'pro' | 'premium';
  interval: 'monthly' | 'yearly';
  amount: number;
  currency: string;
}

// ============================================================================
// RETENTION EVENTS (TRACK-006)
// ============================================================================

export type RetentionEvent =
  | 'return_session'
  | 'writing_streak'
  | 'books_completed';

export interface ReturnSessionProperties extends BaseEventProperties {
  days_since_last_session: number;
  total_sessions: number;
}

export interface WritingStreakProperties extends BaseEventProperties {
  streak_days: number;
  total_words_in_streak: number;
}

// ============================================================================
// RELIABILITY EVENTS (TRACK-007)
// ============================================================================

export type ReliabilityEvent =
  | 'error_shown'
  | 'pdf_generation_failed'
  | 'print_order_failed'
  | 'api_error';

export interface ErrorProperties extends BaseEventProperties {
  error_type: string;
  error_message: string;
  error_code?: string;
  stack_trace?: string;
  user_action: string;
}


// ============================================================================
// NORTH STAR METRICS
// ============================================================================

export interface NorthStarMetrics {
  // Activated = first_book_created
  activated: boolean;

  // First Value = first 1000 words written
  first_value_achieved: boolean;

  // Aha Moment = first PDF generated
  aha_moment_reached: boolean;

  // Monetized = order placed
  monetized: boolean;
}
