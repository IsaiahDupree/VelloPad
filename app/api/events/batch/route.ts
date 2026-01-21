/**
 * Batch Events API
 * Feature: BS-701
 *
 * POST /api/events/batch - Track multiple events at once
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { trackEventBatch, type TrackEventOptions } from '@/lib/events';

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

    // Validate events array
    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: events must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each event
    for (const event of body.events) {
      if (!event.eventName || !event.eventCategory) {
        return NextResponse.json(
          { error: 'Invalid event: missing eventName or eventCategory' },
          { status: 400 }
        );
      }
    }

    // Extract user context
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const referrer = request.headers.get('referer') || undefined;

    // Add user context to each event
    const eventsWithContext = body.events.map((event: any) => ({
      userId: user.id,
      workspaceId: event.workspaceId,
      bookId: event.bookId,
      orderId: event.orderId,
      eventName: event.eventName,
      eventCategory: event.eventCategory,
      properties: event.properties || {},
      userAgent,
      ipAddress,
      referrer,
      sessionId: event.sessionId,
    })) as TrackEventOptions[];

    // Track batch
    const result = await trackEventBatch(eventsWithContext);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to track events' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error('Error in POST /api/events/batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
