/**
 * API Routes for Version Snapshots
 * GET /api/books/[id]/snapshots - Get all snapshots for a book
 * POST /api/books/[id]/snapshots - Create a manual snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSnapshot, getSnapshots } from '@/lib/versions/snapshots';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/books/[id]/snapshots
 * Get all snapshots for a book
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id: bookId } = await context.params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  // Fetch snapshots
  const snapshots = await getSnapshots(bookId);

  return NextResponse.json({ snapshots });
}

/**
 * POST /api/books/[id]/snapshots
 * Create a manual snapshot
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: bookId } = await context.params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  // Parse request body
  const body = await request.json();
  const { label, description } = body;

  // Create snapshot
  const snapshot = await createSnapshot({
    bookId,
    userId: user.id,
    type: 'manual',
    label,
    description,
  });

  if (!snapshot) {
    return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 });
  }

  return NextResponse.json({ snapshot }, { status: 201 });
}
