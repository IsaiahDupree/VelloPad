import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasWorkspaceAccess } from '@/lib/auth/workspaces';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid updates format' },
        { status: 400 }
      );
    }

    // Get book and verify access
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('workspace_id')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const hasAccess = await hasWorkspaceAccess(user.id, book.workspace_id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this book' },
        { status: 403 }
      );
    }

    // Update each chapter's position
    for (const update of updates) {
      await supabase
        .from('chapters')
        .update({ position: update.position })
        .eq('id', update.id)
        .eq('book_id', bookId);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/books/[id]/chapters/reorder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
