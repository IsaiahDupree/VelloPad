/**
 * API Route: Compute Segment Membership
 * POST /api/segments/:segmentId/compute-membership
 *
 * Recomputes segment membership for all persons
 * Adds/removes persons from segment_membership table based on current filter criteria
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeSegmentMembership } from '@/lib/segments/segment-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: { segmentId: string } }
) {
  try {
    const { segmentId } = params;

    // Compute segment membership
    const stats = await computeSegmentMembership(segmentId);

    return NextResponse.json({
      success: true,
      segmentId: stats.segmentId,
      membersAdded: stats.membersAdded,
      membersRemoved: stats.membersRemoved,
      totalMembers: stats.totalMembers,
    });
  } catch (error: any) {
    console.error('[API] Compute segment membership error:', error);
    return NextResponse.json(
      { error: 'Failed to compute segment membership', details: error.message },
      { status: 500 }
    );
  }
}
