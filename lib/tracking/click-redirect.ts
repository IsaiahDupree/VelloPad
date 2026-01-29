/**
 * Click Redirect Tracker - GDP-006
 *
 * Implements attribution spine: email → click → session → conversion
 * Uses first-party cookies to track user journey from email clicks to conversions
 */

import { createClient } from '@/lib/supabase/server';

export interface ClickTrackingParams {
  /**
   * Email message ID (from email_message table)
   */
  emailId?: string;

  /**
   * Campaign ID (for campaign tracking)
   */
  campaignId?: string;

  /**
   * Original destination URL
   */
  url: string;

  /**
   * Person ID (if known at link generation time)
   */
  personId?: string;

  /**
   * Custom properties to attach to the click event
   */
  properties?: Record<string, any>;
}

export interface ClickEvent {
  id: string;
  emailMessageId?: string;
  campaignId?: string;
  personId?: string;
  destinationUrl: string;
  clickedAt: Date;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  properties?: Record<string, any>;
}

/**
 * Generate a tracked click URL
 * Wraps destination URL with click tracking redirect
 */
export function generateTrackedUrl(params: ClickTrackingParams): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vellopad.com';
  const trackingUrl = new URL('/api/track/click', baseUrl);

  // Encode destination URL
  trackingUrl.searchParams.set('url', params.url);

  // Add optional tracking parameters
  if (params.emailId) {
    trackingUrl.searchParams.set('eid', params.emailId);
  }

  if (params.campaignId) {
    trackingUrl.searchParams.set('cid', params.campaignId);
  }

  if (params.personId) {
    trackingUrl.searchParams.set('pid', params.personId);
  }

  // Add custom properties as base64 encoded JSON
  if (params.properties && Object.keys(params.properties).length > 0) {
    const propsJson = JSON.stringify(params.properties);
    const propsB64 = Buffer.from(propsJson).toString('base64url');
    trackingUrl.searchParams.set('props', propsB64);
  }

  return trackingUrl.toString();
}

/**
 * Parse tracked URL parameters
 */
export function parseTrackedUrl(url: URL): {
  destinationUrl: string;
  emailId?: string;
  campaignId?: string;
  personId?: string;
  properties?: Record<string, any>;
} {
  const destinationUrl = url.searchParams.get('url') || '/';
  const emailId = url.searchParams.get('eid') || undefined;
  const campaignId = url.searchParams.get('cid') || undefined;
  const personId = url.searchParams.get('pid') || undefined;

  let properties: Record<string, any> | undefined;
  const propsB64 = url.searchParams.get('props');
  if (propsB64) {
    try {
      const propsJson = Buffer.from(propsB64, 'base64url').toString('utf-8');
      properties = JSON.parse(propsJson);
    } catch (error) {
      console.warn('Failed to parse click tracking properties:', error);
    }
  }

  return {
    destinationUrl,
    emailId,
    campaignId,
    personId,
    properties,
  };
}

/**
 * Record click event and create attribution session
 */
export async function recordClickEvent(params: {
  emailMessageId?: string;
  campaignId?: string;
  personId?: string;
  destinationUrl: string;
  userAgent?: string;
  ipAddress?: string;
  properties?: Record<string, any>;
}): Promise<{
  clickEventId: string;
  sessionId: string;
  personId?: string;
}> {
  const supabase = await createClient();

  // Generate unique IDs using crypto.randomUUID() (Web Crypto API compatible with Edge Runtime)
  const clickEventId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();

  // Determine person_id
  let personId = params.personId;

  // If we have an email_message_id, fetch the person_id from email_message
  if (params.emailMessageId && !personId) {
    const { data: emailMessage } = await supabase
      .from('email_message')
      .select('person_id')
      .eq('id', params.emailMessageId)
      .single();

    if (emailMessage) {
      personId = emailMessage.person_id;
    }
  }

  // Record email_event (if from email)
  if (params.emailMessageId && personId) {
    await supabase.from('email_event').insert({
      id: clickEventId,
      email_message_id: params.emailMessageId,
      person_id: personId,
      event_type: 'clicked',
      event_timestamp: new Date().toISOString(),
      clicked_url: params.destinationUrl,
      user_agent: params.userAgent,
      ip_address: params.ipAddress,
      raw_event: {
        session_id: sessionId,
        ...(params.properties || {}),
      },
    });

    // Update email_message with click stats
    await supabase.rpc('increment_email_click_count', {
      message_id: params.emailMessageId,
    });
  }

  // Record unified_event (for all clicks)
  if (personId) {
    await supabase.from('unified_event').insert({
      person_id: personId,
      event_name: 'email.clicked',
      event_source: 'email',
      event_timestamp: new Date().toISOString(),
      session_id: sessionId,
      properties: {
        email_message_id: params.emailMessageId,
        campaign_id: params.campaignId,
        destination_url: params.destinationUrl,
        ...(params.properties || {}),
      },
      raw_event: {
        user_agent: params.userAgent,
        ip_address: params.ipAddress,
      },
    });
  }

  return {
    clickEventId,
    sessionId,
    personId,
  };
}

/**
 * Create attribution cookie for session tracking
 */
export function createAttributionCookie(params: {
  sessionId: string;
  emailMessageId?: string;
  campaignId?: string;
  personId?: string;
}): string {
  const cookieData = {
    sid: params.sessionId,
    eid: params.emailMessageId,
    cid: params.campaignId,
    pid: params.personId,
    ts: Date.now(),
  };

  const cookieValue = Buffer.from(JSON.stringify(cookieData)).toString('base64url');

  // Cookie expires in 30 days
  const maxAge = 30 * 24 * 60 * 60;

  return `_vp_attr=${cookieValue}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

/**
 * Parse attribution cookie
 */
export function parseAttributionCookie(cookieHeader: string | null): {
  sessionId?: string;
  emailMessageId?: string;
  campaignId?: string;
  personId?: string;
  timestamp?: number;
} | null {
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/_vp_attr=([^;]+)/);
  if (!match) return null;

  try {
    const cookieValue = match[1];
    const cookieJson = Buffer.from(cookieValue, 'base64url').toString('utf-8');
    const cookieData = JSON.parse(cookieJson);

    return {
      sessionId: cookieData.sid,
      emailMessageId: cookieData.eid,
      campaignId: cookieData.cid,
      personId: cookieData.pid,
      timestamp: cookieData.ts,
    };
  } catch (error) {
    console.warn('Failed to parse attribution cookie:', error);
    return null;
  }
}

/**
 * Rewrite URLs in email HTML to include tracking
 */
export function rewriteEmailLinksWithTracking(
  html: string,
  emailMessageId: string,
  personId?: string,
  campaignId?: string
): string {
  // Regular expression to match href attributes
  const hrefRegex = /href=["']([^"']+)["']/gi;

  return html.replace(hrefRegex, (match, url) => {
    // Skip mailto, tel, and anchor links
    if (
      url.startsWith('mailto:') ||
      url.startsWith('tel:') ||
      url.startsWith('#')
    ) {
      return match;
    }

    // Skip unsubscribe links (keep direct for compliance)
    if (url.includes('unsubscribe')) {
      return match;
    }

    // Generate tracked URL
    const trackedUrl = generateTrackedUrl({
      url,
      emailId: emailMessageId,
      personId,
      campaignId,
    });

    return `href="${trackedUrl}"`;
  });
}

/**
 * RPC function to increment email click count
 * This should be created as a database function
 */
export const INCREMENT_EMAIL_CLICK_COUNT_SQL = `
CREATE OR REPLACE FUNCTION increment_email_click_count(message_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE email_message
  SET
    click_count = click_count + 1,
    first_clicked_at = COALESCE(first_clicked_at, NOW()),
    status = CASE
      WHEN status IN ('sent', 'delivered', 'opened') THEN 'clicked'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = message_id;
END;
$$ LANGUAGE plpgsql;
`;
