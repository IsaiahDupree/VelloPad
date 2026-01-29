/**
 * API Route: Get Segment Members
 * GET /api/segments/:segmentId/members
 *
 * Returns all active members of a segment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSegmentMembers } from '@/lib/segments/segment-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: { segmentId: string } }
) {
  try {
    const { segmentId } = params;

    const members = await getSegmentMembers(segmentId);

    return NextResponse.json({
      segmentId,
      count: members.length,
      members,
    });
  } catch (error: any) {
    console.error('[API] Get segment members error:', error);
    return NextResponse.json(
      { error: 'Failed to get segment members', details: error.message },
      { status: 500 }
    );
  }
}
