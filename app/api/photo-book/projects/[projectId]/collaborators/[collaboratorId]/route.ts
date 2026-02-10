/**
 * Individual Collaborator API
 * Feature: PB-029
 *
 * Endpoints:
 * - PUT: Update collaborator role
 * - DELETE: Remove collaborator
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCollaborationService } from '@/lib/collaboration';

export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string; collaboratorId: string } }
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

    // Check if user can edit this project
    const canEdit = await collaborationService.canEdit(params.projectId);
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !['owner', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await collaborationService.updateCollaboratorRole(params.collaboratorId, role);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating collaborator:', error);
    return NextResponse.json(
      { error: 'Failed to update collaborator' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; collaboratorId: string } }
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

    // Check if user can edit this project
    const canEdit = await collaborationService.canEdit(params.projectId);
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await collaborationService.removeCollaborator(params.collaboratorId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    return NextResponse.json(
      { error: 'Failed to remove collaborator' },
      { status: 500 }
    );
  }
}
