/**
 * API Route: Segment Operations
 * GET /api/segments/:segmentId - Get segment details
 * PATCH /api/segments/:segmentId - Update segment
 * DELETE /api/segments/:segmentId - Delete segment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateSegmentCriteria } from '@/lib/segments/segment-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: { segmentId: string } }
) {
  try {
    const { segmentId } = params;
    const supabase = await createClient();

    const { data: segment, error } = await supabase
      .from('segment')
      .select('*')
      .eq('id', segmentId)
      .single();

    if (error || !segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    return NextResponse.json({ segment });
  } catch (error: any) {
    console.error('[API] Get segment error:', error);
    return NextResponse.json(
      { error: 'Failed to get segment', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { segmentId: string } }
) {
  try {
    const { segmentId } = params;
    const body = await request.json();
    const supabase = await createClient();

    // If updating filter criteria, use the segment engine function
    if (body.filterCriteria) {
      await updateSegmentCriteria(segmentId, body.filterCriteria);

      const { data: segment } = await supabase
        .from('segment')
        .select('*')
        .eq('id', segmentId)
        .single();

      return NextResponse.json({
        success: true,
        segment,
      });
    }

    // Otherwise, update other fields directly
    const updates: any = {};

    if (body.segmentName) updates.segment_name = body.segmentName;
    if (body.description !== undefined) updates.description = body.description;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.properties) updates.properties = body.properties;

    updates.updated_at = new Date().toISOString();

    const { data: segment, error } = await supabase
      .from('segment')
      .update(updates)
      .eq('id', segmentId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      segment,
    });
  } catch (error: any) {
    console.error('[API] Update segment error:', error);
    return NextResponse.json(
      { error: 'Failed to update segment', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { segmentId: string } }
) {
  try {
    const { segmentId } = params;
    const supabase = await createClient();

    // Delete segment (cascade will remove memberships)
    const { error } = await supabase.from('segment').delete().eq('id', segmentId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Segment deleted successfully',
    });
  } catch (error: any) {
    console.error('[API] Delete segment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete segment', details: error.message },
      { status: 500 }
    );
  }
}
