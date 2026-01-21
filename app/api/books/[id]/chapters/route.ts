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
    const { title, position } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
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

    // Create chapter
    const { data: chapter, error: insertError } = await supabase
      .from('chapters')
      .insert({
        book_id: bookId,
        title,
        position: position ?? 0,
        content: {},
        word_count: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating chapter:', insertError);
      return NextResponse.json(
        { error: 'Failed to create chapter' },
        { status: 500 }
      );
    }

    return NextResponse.json({ chapter }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/books/[id]/chapters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
