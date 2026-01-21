/**
 * Photo Book Projects API
 * POST /api/photo-book/projects - Create new project
 * GET /api/photo-book/projects - List projects
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      workspaceId,
      title = 'Untitled Photo Book',
      description,
      pageSize = '8x8',
      bindingType = 'hardcover',
      layoutStyle = 'classic'
    } = body

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    // Verify workspace access
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })
    }

    // Create project
    const { data: project, error: createError } = await supabase
      .from('photo_book_projects')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        title,
        description,
        page_size: pageSize,
        binding_type: bindingType,
        layout_style: layoutStyle,
        status: 'draft'
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create project:', createError)
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating photo book project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('photo_book_projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: projects, error: fetchError } = await query

    if (fetchError) {
      console.error('Failed to fetch projects:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    return NextResponse.json({ projects }, { status: 200 })
  } catch (error) {
    console.error('Error fetching photo book projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
