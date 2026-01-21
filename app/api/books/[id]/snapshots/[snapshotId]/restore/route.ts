/**
 * API Route for Snapshot Restore
 * POST /api/books/[id]/snapshots/[snapshotId]/restore - Restore from a snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { restoreSnapshot, getSnapshot } from '@/lib/versions/snapshots';

interface RouteContext {
  params: Promise<{
    id: string;
    snapshotId: string;
  }>;
}

/**
 * POST /api/books/[id]/snapshots/[snapshotId]/restore
 * Restore a book from a snapshot
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: bookId, snapshotId } = await context.params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify snapshot exists and belongs to the book
  const snapshot = await getSnapshot(snapshotId);
  if (!snapshot) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
  }

  if (snapshot.book_id !== bookId) {
    return NextResponse.json({ error: 'Snapshot does not belong to this book' }, { status: 400 });
  }

  // Verify book access
  const { data: book } = await supabase
    .from('books')
    .select('workspace_id')
    .eq('id', bookId)
    .single();

  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  // Restore from snapshot
  const result = await restoreSnapshot(snapshotId, user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ message: 'Book restored successfully', snapshot });
}
