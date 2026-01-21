/**
 * API Routes for Individual Snapshots
 * DELETE /api/books/[id]/snapshots/[snapshotId] - Delete a snapshot
 * POST /api/books/[id]/snapshots/[snapshotId]/restore - Restore from a snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteSnapshot, restoreSnapshot, getSnapshot } from '@/lib/versions/snapshots';

interface RouteContext {
  params: Promise<{
    id: string;
    snapshotId: string;
  }>;
}

/**
 * DELETE /api/books/[id]/snapshots/[snapshotId]
 * Delete a snapshot
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id: bookId, snapshotId } = await context.params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify snapshot exists and belongs to user
  const snapshot = await getSnapshot(snapshotId);
  if (!snapshot) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
  }

  if (snapshot.book_id !== bookId) {
    return NextResponse.json({ error: 'Snapshot does not belong to this book' }, { status: 400 });
  }

  if (snapshot.created_by !== user.id) {
    return NextResponse.json({ error: 'Cannot delete snapshot created by another user' }, { status: 403 });
  }

  // Delete snapshot
  const success = await deleteSnapshot(snapshotId);
  if (!success) {
    return NextResponse.json({ error: 'Failed to delete snapshot' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Snapshot deleted successfully' });
}
