import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasWorkspaceAccess } from '@/lib/auth/workspaces';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id: bookId, chapterId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, word_count } = body;

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

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (word_count !== undefined) updates.word_count = word_count;

    // Update chapter
    const { data: chapter, error: updateError } = await supabase
      .from('chapters')
      .update(updates)
      .eq('id', chapterId)
      .eq('book_id', bookId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating chapter:', updateError);
      return NextResponse.json(
        { error: 'Failed to update chapter' },
        { status: 500 }
      );
    }

    return NextResponse.json({ chapter }, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/books/[id]/chapters/[chapterId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id: bookId, chapterId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Delete chapter
    const { error: deleteError } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId)
      .eq('book_id', bookId);

    if (deleteError) {
      console.error('Error deleting chapter:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete chapter' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/books/[id]/chapters/[chapterId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
