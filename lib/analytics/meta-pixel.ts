/**
 * Meta Pixel Client-Side Tracking
 * Features: META-001, META-002, META-003
 *
 * Client-side Facebook Pixel integration for browser event tracking
 */

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: (...args: any[]) => void;
  }
}

export type MetaStandardEvent =
  | 'PageView'
  | 'ViewContent'
  | 'Search'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Lead'
  | 'CompleteRegistration'
  | 'Contact'
  | 'CustomizeProduct'
  | 'Donate'
  | 'FindLocation'
  | 'Schedule'
  | 'StartTrial'
  | 'SubmitApplication'
  | 'Subscribe';

export interface MetaEventParameters {
  content_category?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  currency?: string;
  value?: number;
  predicted_ltv?: number;
  num_items?: number;
  search_string?: string;
  status?: boolean;
  eventID?: string; // For CAPI deduplication
  [key: string]: any;
}

/**
 * Initialize Meta Pixel
 * @param pixelId - Your Facebook Pixel ID
 */
export function initMetaPixel(pixelId: string): void {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq !== 'undefined') return; // Already initialized

  // Pixel stub before script loads
  const fbq: any = function (...args: any[]) {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, args);
    } else {
      fbq.queue.push(args);
    }
  };

  if (!window.fbq) window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  // Load pixel script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  // Initialize pixel
  window.fbq('init', pixelId);

  // Track PageView automatically
  window.fbq('track', 'PageView');
}

/**
 * Track standard Meta Pixel event
 * @param eventName - Standard event name
 * @param parameters - Event parameters
 */
export function trackMetaEvent(
  eventName: MetaStandardEvent,
  parameters?: MetaEventParameters
): void {
  if (typeof window === 'undefined' || !window.fbq) return;

  window.fbq('track', eventName, parameters);
}

/**
 * Track custom Meta Pixel event
 * @param eventName - Custom event name
 * @param parameters - Event parameters
 */
export function trackMetaCustomEvent(
  eventName: string,
  parameters?: MetaEventParameters
): void {
  if (typeof window === 'undefined' || !window.fbq) return;

  window.fbq('trackCustom', eventName, parameters);
}

/**
 * Track PageView (use for SPA navigation)
 */
export function trackMetaPageView(): void {
  trackMetaEvent('PageView');
}

/**
 * Track ViewContent event
 */
export function trackMetaViewContent(params: {
  contentName: string;
  contentCategory?: string;
  contentIds?: string[];
  value?: number;
  currency?: string;
  eventID?: string;
}): void {
  trackMetaEvent('ViewContent', {
    content_name: params.contentName,
    content_category: params.contentCategory,
    content_ids: params.contentIds,
    value: params.value,
    currency: params.currency || 'USD',
    eventID: params.eventID,
  });
}

/**
 * Track Lead event (signup, form submission)
 */
export function trackMetaLead(params: {
  contentName?: string;
  value?: number;
  currency?: string;
  eventID?: string;
}): void {
  trackMetaEvent('Lead', {
    content_name: params.contentName,
    value: params.value,
    currency: params.currency || 'USD',
    eventID: params.eventID,
  });
}

/**
 * Track CompleteRegistration event
 */
export function trackMetaCompleteRegistration(params: {
  contentName?: string;
  value?: number;
  currency?: string;
  status?: boolean;
  eventID?: string;
}): void {
  trackMetaEvent('CompleteRegistration', {
    content_name: params.contentName,
    value: params.value,
    currency: params.currency || 'USD',
    status: params.status,
    eventID: params.eventID,
  });
}

/**
 * Track InitiateCheckout event
 */
export function trackMetaInitiateCheckout(params: {
  contentIds: string[];
  contentName?: string;
  numItems: number;
  value: number;
  currency?: string;
  eventID?: string;
}): void {
  trackMetaEvent('InitiateCheckout', {
    content_ids: params.contentIds,
    content_name: params.contentName,
    num_items: params.numItems,
    value: params.value,
    currency: params.currency || 'USD',
    eventID: params.eventID,
  });
}

/**
 * Track Purchase event
 */
export function trackMetaPurchase(params: {
  contentIds: string[];
  contentName?: string;
  contentType?: string;
  numItems: number;
  value: number;
  currency?: string;
  eventID?: string;
}): void {
  trackMetaEvent('Purchase', {
    content_ids: params.contentIds,
    content_name: params.contentName,
    content_type: params.contentType,
    num_items: params.numItems,
    value: params.value,
    currency: params.currency || 'USD',
    eventID: params.eventID,
  });
}

/**
 * Track StartTrial event (for subscription starts)
 */
export function trackMetaStartTrial(params: {
  value: number;
  currency?: string;
  predictedLtv?: number;
  eventID?: string;
}): void {
  trackMetaEvent('StartTrial', {
    value: params.value,
    currency: params.currency || 'USD',
    predicted_ltv: params.predictedLtv,
    eventID: params.eventID,
  });
}

/**
 * Track Subscribe event
 */
export function trackMetaSubscribe(params: {
  value: number;
  currency?: string;
  predictedLtv?: number;
  eventID?: string;
}): void {
  trackMetaEvent('Subscribe', {
    value: params.value,
    currency: params.currency || 'USD',
    predicted_ltv: params.predictedLtv,
    eventID: params.eventID,
  });
}

/**
 * Generate unique event ID for deduplication with CAPI
 */
export function generateEventID(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Check if Meta Pixel is loaded
 */
export function isMetaPixelLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq !== 'undefined';
}
