/**
 * Rendition API Endpoint
 * Feature: BS-401
 *
 * POST /api/renditions - Create a new rendition request
 * GET /api/renditions - List renditions for workspace
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enqueueRenditionRequest } from '@/lib/rendition/queue'

// ============================================================================
// POST /api/renditions
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { bookId, versionSnapshotId, options } = body

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    // Verify book exists and user has access
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, workspace_id, title')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Verify user is member of workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', book.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Enqueue rendition request
    const { renditionId, jobIds } = await enqueueRenditionRequest({
      bookId,
      workspaceId: book.workspace_id,
      userId: user.id,
      versionSnapshotId,
      options,
    })

    return NextResponse.json(
      {
        success: true,
        renditionId,
        jobIds,
        message: 'Rendition request enqueued',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Rendition request failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to create rendition',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET /api/renditions
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')
    const workspaceId = searchParams.get('workspaceId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build query
    let query = supabase
      .from('renditions')
      .select(
        `
        *,
        books (
          id,
          title,
          workspace_id
        ),
        render_jobs (
          id,
          job_id,
          job_type,
          status,
          progress,
          started_at,
          completed_at
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (bookId) {
      query = query.eq('book_id', bookId)
    }

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    const { data: renditions, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      renditions,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false,
      },
    })
  } catch (error: any) {
    console.error('Failed to fetch renditions:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch renditions',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
