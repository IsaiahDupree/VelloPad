/**
 * Photo Book Presence API
 * Feature: PB-029
 *
 * Endpoints:
 * - GET: Get active sessions (online collaborators)
 * - POST: Update presence (heartbeat)
 * - DELETE: Remove presence (disconnect)
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

    const sessions = await collaborationService.getActiveSessions(params.projectId);

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active sessions' },
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
    const { pageId, cursorPosition } = body;

    await collaborationService.startPresence(params.projectId, pageId);

    if (cursorPosition) {
      await collaborationService.updateCursorPosition(
        params.projectId,
        cursorPosition
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating presence:', error);
    return NextResponse.json(
      { error: 'Failed to update presence' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    await collaborationService.stopPresence();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error stopping presence:', error);
    return NextResponse.json(
      { error: 'Failed to stop presence' },
      { status: 500 }
    );
  }
}
