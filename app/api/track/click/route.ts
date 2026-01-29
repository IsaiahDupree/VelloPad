/**
 * Click Redirect Tracker API - GDP-006
 *
 * Handles email click tracking and attribution:
 * 1. Records click event
 * 2. Sets attribution cookie
 * 3. Redirects to destination URL
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  parseTrackedUrl,
  recordClickEvent,
  createAttributionCookie,
} from '@/lib/tracking/click-redirect';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Parse tracking parameters
    const {
      destinationUrl,
      emailId,
      campaignId,
      personId,
      properties,
    } = parseTrackedUrl(url);

    // Validate destination URL
    if (!destinationUrl) {
      return NextResponse.json(
        { error: 'Missing destination URL' },
        { status: 400 }
      );
    }

    // Get user agent and IP
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined;

    // Record click event
    const { clickEventId, sessionId, personId: resolvedPersonId } = await recordClickEvent({
      emailMessageId: emailId,
      campaignId,
      personId,
      destinationUrl,
      userAgent,
      ipAddress,
      properties,
    });

    // Create attribution cookie
    const attributionCookie = createAttributionCookie({
      sessionId,
      emailMessageId: emailId,
      campaignId,
      personId: resolvedPersonId,
    });

    // Create redirect response
    const response = NextResponse.redirect(destinationUrl);

    // Set attribution cookie
    response.headers.set('Set-Cookie', attributionCookie);

    // Add cache headers (don't cache click redirects)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return response;
  } catch (error: any) {
    console.error('Click tracking error:', error);

    // Fallback: redirect to destination URL even if tracking fails
    const url = new URL(request.url);
    const destinationUrl = url.searchParams.get('url') || '/';

    return NextResponse.redirect(destinationUrl, { status: 302 });
  }
}
