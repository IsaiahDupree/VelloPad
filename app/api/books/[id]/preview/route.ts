import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type = 'interior', include_cover = false } = body;

    // Fetch book and verify access
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*, workspace:workspaces!inner(*)')
      .eq('id', id)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check workspace access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', book.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch chapters for preview
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, title, content, word_count, position')
      .eq('book_id', id)
      .order('position', { ascending: true });

    // Generate preview (lightweight version, not full PDF)
    // This creates a quick HTML preview, not a print-ready PDF
    const preview = {
      book: {
        id: book.id,
        title: book.title,
        subtitle: book.subtitle,
        author: book.author,
        genre: book.genre,
        trim_size: book.trim_size,
        binding: book.binding,
      },
      chapters: chapters || [],
      metadata: {
        word_count: book.word_count,
        page_count: book.page_count || Math.ceil((book.word_count || 0) / 250), // Estimate
        generated_at: new Date().toISOString(),
      }
    };

    // For print simulation, we would trigger a rendition job
    // For now, return preview data for fast preview
    if (type === 'print') {
      // Check if there's an existing rendition
      const { data: existingRendition } = await supabase
        .from('renditions')
        .select('*')
        .eq('book_id', id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingRendition) {
        return NextResponse.json({
          preview_url: existingRendition.interior_pdf_url,
          rendition_id: existingRendition.id,
          generated_at: existingRendition.completed_at,
        });
      }

      // If no existing rendition, create a new one
      // Note: This would normally trigger the queue (BS-401)
      // For now, return a placeholder
      return NextResponse.json({
        message: 'Print preview generation not yet implemented',
        preview_data: preview,
        note: 'This requires rendition queue (BS-401) to be fully functional'
      });
    }

    // Return fast preview data
    return NextResponse.json({
      preview_data: preview,
      type: 'fast',
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get existing preview/rendition
    const { data: renditions } = await supabase
      .from('renditions')
      .select('*')
      .eq('book_id', id)
      .order('created_at', { ascending: false });

    const latestCompleted = renditions?.find(r => r.status === 'completed');
    const latestInProgress = renditions?.find(r => ['queued', 'processing'].includes(r.status));

    return NextResponse.json({
      latest_completed: latestCompleted || null,
      latest_in_progress: latestInProgress || null,
      all_renditions: renditions || [],
    });
  } catch (error) {
    console.error('Error fetching preview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preview' },
      { status: 500 }
    );
  }
}
