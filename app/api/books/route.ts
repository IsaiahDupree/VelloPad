import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasWorkspaceAccess } from '@/lib/auth/workspaces';

export async function POST(request: Request) {
  try {
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
    const { workspaceId, title, subtitle, author, genre, trimSize, binding } = body;

    // Validate required fields
    if (!workspaceId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, title' },
        { status: 400 }
      );
    }

    // Check workspace access
    const hasAccess = await hasWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this workspace' },
        { status: 403 }
      );
    }

    // Create book
    const { data: book, error: insertError } = await supabase
      .from('books')
      .insert({
        workspace_id: workspaceId,
        created_by: user.id,
        title,
        subtitle: subtitle || null,
        author: author || null,
        genre: genre || 'other',
        trim_size: trimSize || '6x9',
        binding: binding || 'perfect_bound',
        word_count: 0,
        completion_percent: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating book:', insertError);
      return NextResponse.json(
        { error: 'Failed to create book' },
        { status: 500 }
      );
    }

    return NextResponse.json({ book }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/books:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace ID from query params
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspaceId parameter' },
        { status: 400 }
      );
    }

    // Check workspace access
    const hasAccess = await hasWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this workspace' },
        { status: 403 }
      );
    }

    // Fetch books for this workspace
    const { data: books, error: fetchError } = await supabase
      .from('books')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching books:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch books' },
        { status: 500 }
      );
    }

    return NextResponse.json({ books }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/books:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
