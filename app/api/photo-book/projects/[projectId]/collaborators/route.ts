/**
 * Photo Book Collaborators API
 * Feature: PB-029
 *
 * Endpoints:
 * - GET: List all collaborators for a project
 * - POST: Invite a new collaborator
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

    const collaborators = await collaborationService.getCollaborators(
      params.projectId
    );

    return NextResponse.json({ collaborators });
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaborators' },
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

    // Check if user can edit this project (add collaborators)
    const canEdit = await collaborationService.canEdit(params.projectId);
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role = 'viewer' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const collaborator = await collaborationService.inviteCollaborator(
      params.projectId,
      email,
      role
    );

    return NextResponse.json({ collaborator }, { status: 201 });
  } catch (error) {
    console.error('Error inviting collaborator:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to invite collaborator' },
      { status: 500 }
    );
  }
}
