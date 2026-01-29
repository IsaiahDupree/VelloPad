/**
 * API Route: Segments
 * GET /api/segments - List all segments
 * POST /api/segments - Create new segment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSegment } from '@/lib/segments/segment-engine';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('segment')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: segments, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      segments: segments || [],
      count: segments?.length || 0,
    });
  } catch (error: any) {
    console.error('[API] Get segments error:', error);
    return NextResponse.json(
      { error: 'Failed to get segments', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { segmentName, segmentKey, description, filterCriteria, segmentType, createdBy } =
      body;

    // Validation
    if (!segmentName || !segmentKey || !filterCriteria || !segmentType) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: segmentName, segmentKey, filterCriteria, segmentType',
        },
        { status: 400 }
      );
    }

    if (!['static', 'dynamic', 'behavioral'].includes(segmentType)) {
      return NextResponse.json(
        { error: 'Invalid segmentType. Must be: static, dynamic, or behavioral' },
        { status: 400 }
      );
    }

    // Create segment
    const segment = await createSegment({
      segmentName,
      segmentKey,
      description,
      filterCriteria,
      segmentType,
      createdBy,
    });

    return NextResponse.json(
      {
        success: true,
        segment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API] Create segment error:', error);
    return NextResponse.json(
      { error: 'Failed to create segment', details: error.message },
      { status: 500 }
    );
  }
}
