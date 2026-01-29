/**
 * Meta Conversions API (CAPI) Server-Side Tracking
 * Features: META-004, META-005, META-006
 *
 * Server-side event tracking via Meta Conversions API
 * https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import crypto from 'crypto';

export interface MetaCAPIEvent {
  event_name: string;
  event_time: number;
  event_id?: string; // For deduplication with browser pixel
  event_source_url?: string;
  action_source: 'website' | 'email' | 'app' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
}

export interface MetaUserData {
  // PII - all values should be hashed with SHA256 before sending
  em?: string; // email (hashed)
  ph?: string; // phone (hashed)
  fn?: string; // first name (hashed)
  ln?: string; // last name (hashed)
  ct?: string; // city (hashed)
  st?: string; // state (hashed)
  zp?: string; // zip/postal code (hashed)
  country?: string; // country code (hashed)

  // Technical data (not hashed)
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string; // Facebook click ID from URL parameter
  fbp?: string; // Facebook browser ID from cookie
  external_id?: string; // Your user ID (hashed)
}

export interface MetaCustomData {
  currency?: string;
  value?: number;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: Array<{
    id: string;
    quantity: number;
    item_price?: number;
  }>;
  num_items?: number;
  predicted_ltv?: number;
  status?: string;
  [key: string]: any;
}

interface MetaCAPIResponse {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
}

/**
 * Hash PII data with SHA256 (required by Meta CAPI)
 * @param value - Raw PII value to hash
 * @returns SHA256 hash in lowercase hex
 */
export function hashPII(value: string | undefined | null): string | undefined {
  if (!value) return undefined;

  // Normalize: lowercase and trim whitespace
  const normalized = value.toLowerCase().trim();

  // Hash with SHA256
  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex');
}

/**
 * Send event to Meta Conversions API
 * @param events - Array of events to send
 * @returns Response from Meta API
 */
export async function sendMetaCAPIEvent(
  events: MetaCAPIEvent[]
): Promise<MetaCAPIResponse | null> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn('Meta CAPI not configured. Set META_PIXEL_ID and META_CAPI_ACCESS_TOKEN');
    return null;
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${pixelId}/events`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: events,
        access_token: accessToken,
        test_event_code: process.env.META_TEST_EVENT_CODE, // For testing
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Meta CAPI error:', errorData);
      return null;
    }

    const data: MetaCAPIResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to send Meta CAPI event:', error);
    return null;
  }
}

/**
 * Track PageView via CAPI
 */
export async function trackCAPIPageView(params: {
  eventId?: string;
  userId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  clientIp?: string;
  userAgent?: string;
  eventSourceUrl?: string;
  fbc?: string;
  fbp?: string;
}): Promise<void> {
  const event: MetaCAPIEvent = {
    event_name: 'PageView',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.eventSourceUrl,
    action_source: 'website',
    user_data: {
      em: hashPII(params.email),
      ph: hashPII(params.phone),
      fn: hashPII(params.firstName),
      ln: hashPII(params.lastName),
      client_ip_address: params.clientIp,
      client_user_agent: params.userAgent,
      fbc: params.fbc,
      fbp: params.fbp,
      external_id: hashPII(params.userId),
    },
  };

  await sendMetaCAPIEvent([event]);
}

/**
 * Track Lead via CAPI (signup, registration)
 */
export async function trackCAPILead(params: {
  eventId?: string;
  userId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  clientIp?: string;
  userAgent?: string;
  eventSourceUrl?: string;
  fbc?: string;
  fbp?: string;
  value?: number;
  currency?: string;
  contentName?: string;
}): Promise<void> {
  const event: MetaCAPIEvent = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.eventSourceUrl,
    action_source: 'website',
    user_data: {
      em: hashPII(params.email),
      ph: hashPII(params.phone),
      fn: hashPII(params.firstName),
      ln: hashPII(params.lastName),
      client_ip_address: params.clientIp,
      client_user_agent: params.userAgent,
      fbc: params.fbc,
      fbp: params.fbp,
      external_id: hashPII(params.userId),
    },
    custom_data: {
      value: params.value,
      currency: params.currency || 'USD',
      content_name: params.contentName,
    },
  };

  await sendMetaCAPIEvent([event]);
}

/**
 * Track CompleteRegistration via CAPI
 */
export async function trackCAPICompleteRegistration(params: {
  eventId?: string;
  userId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  clientIp?: string;
  userAgent?: string;
  eventSourceUrl?: string;
  fbc?: string;
  fbp?: string;
  value?: number;
  currency?: string;
  status?: boolean;
}): Promise<void> {
  const event: MetaCAPIEvent = {
    event_name: 'CompleteRegistration',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.eventSourceUrl,
    action_source: 'website',
    user_data: {
      em: hashPII(params.email),
      ph: hashPII(params.phone),
      fn: hashPII(params.firstName),
      ln: hashPII(params.lastName),
      client_ip_address: params.clientIp,
      client_user_agent: params.userAgent,
      fbc: params.fbc,
      fbp: params.fbp,
      external_id: hashPII(params.userId),
    },
    custom_data: {
      value: params.value,
      currency: params.currency || 'USD',
      status: params.status ? 'completed' : 'incomplete',
    },
  };

  await sendMetaCAPIEvent([event]);
}

/**
 * Track InitiateCheckout via CAPI
 */
export async function trackCAPIInitiateCheckout(params: {
  eventId?: string;
  userId: string;
  email?: string;
  phone?: string;
  clientIp?: string;
  userAgent?: string;
  eventSourceUrl?: string;
  fbc?: string;
  fbp?: string;
  contentIds: string[];
  contentName?: string;
  numItems: number;
  value: number;
  currency?: string;
}): Promise<void> {
  const event: MetaCAPIEvent = {
    event_name: 'InitiateCheckout',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.eventSourceUrl,
    action_source: 'website',
    user_data: {
      em: hashPII(params.email),
      ph: hashPII(params.phone),
      client_ip_address: params.clientIp,
      client_user_agent: params.userAgent,
      fbc: params.fbc,
      fbp: params.fbp,
      external_id: hashPII(params.userId),
    },
    custom_data: {
      content_ids: params.contentIds,
      content_name: params.contentName,
      num_items: params.numItems,
      value: params.value,
      currency: params.currency || 'USD',
    },
  };

  await sendMetaCAPIEvent([event]);
}

/**
 * Track Purchase via CAPI
 */
export async function trackCAPIPurchase(params: {
  eventId?: string;
  userId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  clientIp?: string;
  userAgent?: string;
  eventSourceUrl?: string;
  fbc?: string;
  fbp?: string;
  contentIds: string[];
  contentName?: string;
  contentType?: string;
  numItems: number;
  value: number;
  currency?: string;
}): Promise<void> {
  const event: MetaCAPIEvent = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.eventSourceUrl,
    action_source: 'website',
    user_data: {
      em: hashPII(params.email),
      ph: hashPII(params.phone),
      fn: hashPII(params.firstName),
      ln: hashPII(params.lastName),
      ct: hashPII(params.city),
      st: hashPII(params.state),
      zp: hashPII(params.zip),
      country: hashPII(params.country),
      client_ip_address: params.clientIp,
      client_user_agent: params.userAgent,
      fbc: params.fbc,
      fbp: params.fbp,
      external_id: hashPII(params.userId),
    },
    custom_data: {
      content_ids: params.contentIds,
      content_name: params.contentName,
      content_type: params.contentType,
      num_items: params.numItems,
      value: params.value,
      currency: params.currency || 'USD',
    },
  };

  await sendMetaCAPIEvent([event]);
}

/**
 * Track Subscribe via CAPI
 */
export async function trackCAPISubscribe(params: {
  eventId?: string;
  userId: string;
  email?: string;
  phone?: string;
  clientIp?: string;
  userAgent?: string;
  eventSourceUrl?: string;
  fbc?: string;
  fbp?: string;
  value: number;
  currency?: string;
  predictedLtv?: number;
}): Promise<void> {
  const event: MetaCAPIEvent = {
    event_name: 'Subscribe',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.eventSourceUrl,
    action_source: 'website',
    user_data: {
      em: hashPII(params.email),
      ph: hashPII(params.phone),
      client_ip_address: params.clientIp,
      client_user_agent: params.userAgent,
      fbc: params.fbc,
      fbp: params.fbp,
      external_id: hashPII(params.userId),
    },
    custom_data: {
      value: params.value,
      currency: params.currency || 'USD',
      predicted_ltv: params.predictedLtv,
    },
  };

  await sendMetaCAPIEvent([event]);
}

/**
 * Extract Facebook Click ID (fbc) from URL
 * Format: fb.1.{timestamp}.{fbclid}
 */
export function extractFBC(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const fbclid = urlObj.searchParams.get('fbclid');

    if (fbclid) {
      const timestamp = Math.floor(Date.now() / 1000);
      return `fb.1.${timestamp}.${fbclid}`;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

/**
 * Extract Facebook Browser ID (fbp) from cookie
 * Format: fb.1.{timestamp}.{random}
 */
export function extractFBP(cookies: string): string | undefined {
  const match = cookies.match(/_fbp=([^;]+)/);
  return match ? match[1] : undefined;
}
