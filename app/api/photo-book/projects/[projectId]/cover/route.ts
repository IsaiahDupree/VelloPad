/**
 * Photo Book Cover API
 * Manage cover designs for photo book projects
 *
 * @see PB-009: Cover Design Editor
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface CoverDesignRow {
  id: string
  project_id: string
  title: string
  subtitle: string | null
  author: string | null
  cover_photo_id: string | null
  layout: string
  text_color: string
  overlay_opacity: number
  overlay_color: string
  title_font_family: string
  title_font_size: number
  title_font_weight: number
  subtitle_font_family: string
  subtitle_font_size: number
  text_position: string
  created_at: string
  updated_at: string
}

/**
 * GET /api/photo-book/projects/[projectId]/cover
 * Get cover design for a project
 */
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project to verify ownership
    const { data: project } = await supabase
      .from('photo_book_projects')
      .select('user_id')
      .eq('id', params.projectId)
      .single()

    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get cover design
    const { data: cover, error } = await supabase
      .from('photo_book_covers')
      .select('*')
      .eq('project_id', params.projectId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({ cover })
  } catch (error) {
    console.error('Error fetching cover design:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cover design' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/photo-book/projects/[projectId]/cover
 * Create or update cover design
 */
export async function PUT(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('photo_book_projects')
      .select('user_id')
      .eq('id', params.projectId)
      .single()

    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!body.coverPhotoId) {
      return NextResponse.json({ error: 'Cover photo is required' }, { status: 400 })
    }

    // Prepare data for database
    const coverData = {
      project_id: params.projectId,
      title: body.title,
      subtitle: body.subtitle || null,
      author: body.author || null,
      cover_photo_id: body.coverPhotoId,
      layout: body.layout,
      text_color: body.textColor,
      overlay_opacity: body.overlayOpacity,
      overlay_color: body.overlayColor,
      title_font_family: body.titleFont.family,
      title_font_size: body.titleFont.size,
      title_font_weight: body.titleFont.weight,
      subtitle_font_family: body.subtitleFont.family,
      subtitle_font_size: body.subtitleFont.size,
      text_position: body.textPosition,
      updated_at: new Date().toISOString()
    }

    // Upsert cover design
    const { data: cover, error } = await supabase
      .from('photo_book_covers')
      .upsert(coverData, {
        onConflict: 'project_id'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ cover })
  } catch (error) {
    console.error('Error saving cover design:', error)
    return NextResponse.json(
      { error: 'Failed to save cover design' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/photo-book/projects/[projectId]/cover
 * Delete cover design
 */
export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('photo_book_projects')
      .select('user_id')
      .eq('id', params.projectId)
      .single()

    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('photo_book_covers')
      .delete()
      .eq('project_id', params.projectId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cover design:', error)
    return NextResponse.json(
      { error: 'Failed to delete cover design' },
      { status: 500 }
    )
  }
}
