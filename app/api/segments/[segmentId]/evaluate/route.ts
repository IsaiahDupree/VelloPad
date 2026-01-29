/**
 * API Route: Evaluate Person for Segment
 * POST /api/segments/:segmentId/evaluate
 *
 * Evaluates if a specific person matches the segment's filter criteria
 */

import { NextRequest, NextResponse } from 'next/server';
import { evaluatePersonForSegment } from '@/lib/segments/segment-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: { segmentId: string } }
) {
  try {
    const { segmentId } = params;
    const body = await request.json();
    const { personId } = body;

    if (!personId) {
      return NextResponse.json(
        { error: 'Missing required field: personId' },
        { status: 400 }
      );
    }

    // Evaluate person for segment
    const result = await evaluatePersonForSegment(personId, segmentId);

    return NextResponse.json({
      matches: result.matches,
      reason: result.reason,
      segmentId,
      personId,
    });
  } catch (error: any) {
    console.error('[API] Segment evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate segment', details: error.message },
      { status: 500 }
    );
  }
}
