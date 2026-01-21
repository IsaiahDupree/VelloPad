import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  removeMemberFromWorkspace,
  updateMemberRole,
} from '@/lib/workspace/roles';

/**
 * DELETE /api/workspaces/[workspaceId]/members/[memberId]
 * Remove a member from the workspace
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  try {
    const { workspaceId, memberId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove member
    const result = await removeMemberFromWorkspace(
      workspaceId,
      user.id,
      memberId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workspaces/[workspaceId]/members/[memberId]
 * Update a member's role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  try {
    const { workspaceId, memberId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { role } = body;

    if (!role || !['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update member role
    const result = await updateMemberRole(workspaceId, user.id, memberId, role);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
