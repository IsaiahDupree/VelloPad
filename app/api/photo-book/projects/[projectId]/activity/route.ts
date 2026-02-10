/**
 * Photo Book Activity Log API
 * Feature: PB-029
 *
 * Endpoints:
 * - GET: Get activity log for a project
 * - POST: Log a new activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCollaborationService } from '@/lib/collaboration';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collaborationService = createCollaborationService(supabase);

    // Check if user can view this project
    const canView = await collaborationService.canView(params.projectId);
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const activities = await collaborationService.getActivityLog(
      params.projectId,
      limit
    );

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity log' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collaborationService = createCollaborationService(supabase);

    // Check if user can view this project
    const canView = await collaborationService.canView(params.projectId);
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { activityType, targetId, metadata } = body;

    if (!activityType) {
      return NextResponse.json(
        { error: 'Activity type is required' },
        { status: 400 }
      );
    }

    await collaborationService.logActivity(
      params.projectId,
      activityType,
      targetId || null,
      metadata || {}
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    );
  }
}
