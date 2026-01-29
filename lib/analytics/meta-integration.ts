/**
 * Meta Pixel + CAPI Integration Layer
 * Features: META-003, META-005
 *
 * Maps VelloPad analytics events to Meta Pixel standard events
 * Handles both browser pixel and server-side CAPI with deduplication
 */

import {
  trackMetaLead,
  trackMetaCompleteRegistration,
  trackMetaInitiateCheckout,
  trackMetaPurchase,
  trackMetaSubscribe,
  trackMetaViewContent,
  generateEventID,
} from './meta-pixel';

import {
  trackCAPILead,
  trackCAPICompleteRegistration,
  trackCAPIInitiateCheckout,
  trackCAPIPurchase,
  trackCAPISubscribe,
  extractFBC,
  extractFBP,
} from './meta-capi';

import type {
  SignupStartProperties,
  SignupCompleteProperties,
  CheckoutStartedProperties,
  PurchaseCompletedProperties,
  SubscriptionStartedProperties,
} from './types';

/**
 * Track signup start (Lead event)
 * Browser: Meta Pixel
 */
export function trackMetaSignupStart(properties: SignupStartProperties) {
  const eventID = generateEventID();

  trackMetaLead({
    contentName: 'Signup Form',
    eventID,
  });
}

/**
 * Track signup complete (CompleteRegistration event)
 * Browser: Meta Pixel
 * Server: CAPI
 */
export function trackMetaSignupComplete(properties: SignupCompleteProperties) {
  const eventID = generateEventID();

  // Browser pixel
  trackMetaCompleteRegistration({
    contentName: 'VelloPad Account',
    status: true,
    eventID,
  });
}

/**
 * Track signup complete from server
 * Server: CAPI only
 */
export async function trackMetaSignupCompleteServer(params: {
  userId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  request?: Request;
}) {
  const eventID = generateEventID();

  // Extract Meta tracking params from request
  const clientIp = params.request?.headers.get('x-forwarded-for')?.split(',')[0];
  const userAgent = params.request?.headers.get('user-agent') || undefined;
  const referer = params.request?.headers.get('referer');
  const cookies = params.request?.headers.get('cookie') || '';

  const fbc = referer ? extractFBC(referer) : undefined;
  const fbp = extractFBP(cookies);

  await trackCAPICompleteRegistration({
    eventId: eventID,
    userId: params.userId,
    email: params.email,
    phone: params.phone,
    firstName: params.firstName,
    lastName: params.lastName,
    clientIp,
    userAgent,
    eventSourceUrl: referer || undefined,
    fbc,
    fbp,
    status: true,
  });
}

/**
 * Track book creation (ViewContent event)
 * Browser: Meta Pixel
 */
export function trackMetaBookCreated(bookId: string, title: string) {
  const eventID = generateEventID();

  trackMetaViewContent({
    contentName: title,
    contentCategory: 'book',
    contentIds: [bookId],
    eventID,
  });
}

/**
 * Track checkout started (InitiateCheckout event)
 * Browser: Meta Pixel
 * Server: CAPI
 */
export function trackMetaCheckoutStarted(properties: CheckoutStartedProperties) {
  const eventID = generateEventID();

  // Browser pixel
  trackMetaInitiateCheckout({
    contentIds: [properties.book_id],
    numItems: properties.quantity,
    value: properties.total_value,
    currency: properties.currency,
    eventID,
  });
}

/**
 * Track checkout started from server
 * Server: CAPI only
 */
export async function trackMetaCheckoutStartedServer(params: {
  userId: string;
  email?: string;
  phone?: string;
  bookId: string;
  quantity: number;
  value: number;
  currency?: string;
  request?: Request;
}) {
  const eventID = generateEventID();

  const clientIp = params.request?.headers.get('x-forwarded-for')?.split(',')[0];
  const userAgent = params.request?.headers.get('user-agent') || undefined;
  const referer = params.request?.headers.get('referer');
  const cookies = params.request?.headers.get('cookie') || '';

  const fbc = referer ? extractFBC(referer) : undefined;
  const fbp = extractFBP(cookies);

  await trackCAPIInitiateCheckout({
    eventId: eventID,
    userId: params.userId,
    email: params.email,
    phone: params.phone,
    clientIp,
    userAgent,
    eventSourceUrl: referer || undefined,
    fbc,
    fbp,
    contentIds: [params.bookId],
    numItems: params.quantity,
    value: params.value,
    currency: params.currency || 'USD',
  });
}

/**
 * Track purchase completed (Purchase event)
 * Browser: Meta Pixel
 * Server: CAPI
 */
export function trackMetaPurchaseComplete(properties: PurchaseCompletedProperties) {
  const eventID = generateEventID();

  // Browser pixel
  trackMetaPurchase({
    contentIds: [properties.book_id],
    contentType: 'product',
    numItems: properties.quantity,
    value: properties.total_value,
    currency: properties.currency,
    eventID,
  });
}

/**
 * Track purchase completed from server
 * Server: CAPI only (most reliable for purchase tracking)
 */
export async function trackMetaPurchaseCompleteServer(params: {
  userId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  bookId: string;
  quantity: number;
  value: number;
  currency?: string;
  request?: Request;
}) {
  const eventID = generateEventID();

  const clientIp = params.request?.headers.get('x-forwarded-for')?.split(',')[0];
  const userAgent = params.request?.headers.get('user-agent') || undefined;
  const referer = params.request?.headers.get('referer');
  const cookies = params.request?.headers.get('cookie') || '';

  const fbc = referer ? extractFBC(referer) : undefined;
  const fbp = extractFBP(cookies);

  await trackCAPIPurchase({
    eventId: eventID,
    userId: params.userId,
    email: params.email,
    phone: params.phone,
    firstName: params.firstName,
    lastName: params.lastName,
    city: params.city,
    state: params.state,
    zip: params.zip,
    country: params.country,
    clientIp,
    userAgent,
    eventSourceUrl: referer || undefined,
    fbc,
    fbp,
    contentIds: [params.bookId],
    contentType: 'product',
    numItems: params.quantity,
    value: params.value,
    currency: params.currency || 'USD',
  });
}

/**
 * Track subscription started (Subscribe event)
 * Browser: Meta Pixel
 * Server: CAPI
 */
export function trackMetaSubscriptionStarted(properties: SubscriptionStartedProperties) {
  const eventID = generateEventID();

  // Calculate predicted LTV (12 months for yearly, 6 months for monthly)
  const predictedLtv = properties.interval === 'yearly'
    ? properties.amount * 2
    : properties.amount * 6;

  // Browser pixel
  trackMetaSubscribe({
    value: properties.amount,
    currency: properties.currency,
    predictedLtv,
    eventID,
  });
}

/**
 * Track subscription started from server
 * Server: CAPI only
 */
export async function trackMetaSubscriptionStartedServer(params: {
  userId: string;
  email?: string;
  phone?: string;
  value: number;
  currency?: string;
  interval: 'monthly' | 'yearly';
  request?: Request;
}) {
  const eventID = generateEventID();

  const clientIp = params.request?.headers.get('x-forwarded-for')?.split(',')[0];
  const userAgent = params.request?.headers.get('user-agent') || undefined;
  const referer = params.request?.headers.get('referer');
  const cookies = params.request?.headers.get('cookie') || '';

  const fbc = referer ? extractFBC(referer) : undefined;
  const fbp = extractFBP(cookies);

  const predictedLtv = params.interval === 'yearly'
    ? params.value * 2
    : params.value * 6;

  await trackCAPISubscribe({
    eventId: eventID,
    userId: params.userId,
    email: params.email,
    phone: params.phone,
    clientIp,
    userAgent,
    eventSourceUrl: referer || undefined,
    fbc,
    fbp,
    value: params.value,
    currency: params.currency || 'USD',
    predictedLtv,
  });
}
