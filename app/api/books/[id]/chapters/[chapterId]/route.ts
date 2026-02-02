import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasWorkspaceAccess } from '@/lib/auth/workspaces';
import { trackServerSideEvent } from '@/lib/analytics/events';

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
    const { title, content, word_count, layout_config } = body;

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
    if (layout_config !== undefined) updates.layout_config = layout_config;

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

    // Track chapter writing event (TRACK-004)
    if (word_count !== undefined && word_count > 0) {
      try {
        // Get total book word count
        const { data: bookData } = await supabase
          .from('books')
          .select('word_count, title')
          .eq('id', bookId)
          .single();

        const totalWordCount = bookData?.word_count || 0;

        trackServerSideEvent(user.id, 'chapter_written', {
          book_id: bookId,
          chapter_id: chapterId,
          word_count: word_count,
          total_book_word_count: totalWordCount,
        });

        // Track word count milestones
        const milestones = [100, 300, 1000, 5000, 10000, 25000, 50000];
        for (const milestone of milestones) {
          if (totalWordCount >= milestone) {
            // Check if we haven't tracked this milestone before
            const milestoneKey = `milestone_${milestone}_${bookId}`;
            // Note: In production, you'd want to store this in a database
            trackServerSideEvent(user.id, 'word_count_milestone', {
              book_id: bookId,
              milestone: milestone,
              current_word_count: totalWordCount,
              is_north_star_metric: milestone === 1000,
            });
          }
        }
      } catch (trackingError) {
        console.error('Failed to track chapter_written event:', trackingError);
      }
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
