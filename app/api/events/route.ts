/**
 * Events API
 * Feature: BS-701
 *
 * POST /api/events - Track a single event
 * POST /api/events/batch - Track multiple events
 * GET /api/events - Get events (with filtering)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  trackEvent,
  trackEventBatch,
  getEvents,
  type TrackEventOptions,
} from '@/lib/events';

// ============================================================================
// POST /api/events - Track Event
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.eventName || !body.eventCategory) {
      return NextResponse.json(
        { error: 'Missing required fields: eventName, eventCategory' },
        { status: 400 }
      );
    }

    // Extract user context from headers
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const referrer = request.headers.get('referer') || undefined;

    // Track event
    const result = await trackEvent({
      userId: user.id,
      workspaceId: body.workspaceId,
      bookId: body.bookId,
      orderId: body.orderId,
      eventName: body.eventName,
      eventCategory: body.eventCategory,
      properties: body.properties || {},
      userAgent,
      ipAddress,
      referrer,
      sessionId: body.sessionId,
    } as TrackEventOptions);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to track event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
    });
  } catch (error) {
    console.error('Error in POST /api/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/events - Get Events
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    const workspaceId = searchParams.get('workspaceId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const bookId = searchParams.get('bookId') || undefined;
    const orderId = searchParams.get('orderId') || undefined;
    const eventName = searchParams.get('eventName') || undefined;
    const eventCategory = searchParams.get('eventCategory') || undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 50;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : 0;

    // Get events
    const result = await getEvents({
      workspaceId,
      userId,
      bookId,
      orderId,
      eventName: eventName as any,
      eventCategory: eventCategory as any,
      startDate,
      endDate,
      limit,
      offset,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events: result.events,
      count: result.events.length,
    });
  } catch (error) {
    console.error('Error in GET /api/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
