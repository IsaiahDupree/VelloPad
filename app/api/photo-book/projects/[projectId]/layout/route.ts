/**
 * Photo Book Layout Generation API
 * POST /api/photo-book/projects/[projectId]/layout - Generate page layouts
 * GET /api/photo-book/projects/[projectId]/layout - Get existing layouts
 * DELETE /api/photo-book/projects/[projectId]/layout - Clear layouts
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  generateLayout,
  estimatePageCount,
  validateLayout,
  type PhotoMetadata,
  type LayoutOptions,
  type LayoutStyle,
  type PageSize
} from '@/lib/layout-engine'

interface RouteParams {
  params: Promise<{
    projectId: string
  }>
}

/**
 * POST - Generate new page layouts
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('photo_book_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Get layout options from request
    const body = await request.json()
    const {
      layoutStyle,
      pageSize,
      photosPerPage,
      coverPhotoId,
      regenerate = false
    } = body

    // Check if layout already exists
    if (!regenerate) {
      const { data: existingPages, error: pagesError } = await supabase
        .from('photo_book_pages')
        .select('id')
        .eq('project_id', projectId)
        .limit(1)

      if (!pagesError && existingPages && existingPages.length > 0) {
        return NextResponse.json(
          { error: 'Layout already exists. Set regenerate=true to regenerate.' },
          { status: 400 }
        )
      }
    }

    // Get photos for this project
    const { data: photos, error: photosError } = await supabase
      .from('photo_book_photos')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (photosError) {
      console.error('Failed to fetch photos:', photosError)
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 }
      )
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: 'No photos in project' },
        { status: 400 }
      )
    }

    // Convert to PhotoMetadata format
    const photoMetadata: PhotoMetadata[] = photos.map(photo => ({
      id: photo.id,
      width: photo.width,
      height: photo.height,
      aspectRatio: photo.aspect_ratio,
      orientation: photo.orientation as any,
      sortOrder: photo.sort_order,
      isPrintSafe: photo.is_print_safe,
      qualityWarnings: photo.quality_warnings
    }))

    // Build layout options
    const layoutOptions: LayoutOptions = {
      pageSize: (pageSize || project.page_size) as PageSize,
      layoutStyle: (layoutStyle || project.layout_style) as LayoutStyle,
      photosPerPage,
      coverPhotoId: coverPhotoId || project.cover_image_id,
      preserveOrder: true
    }

    // Generate layout
    const result = generateLayout(photoMetadata, layoutOptions)

    // Validate layout
    const validationErrors = validateLayout(result, photoMetadata)
    if (validationErrors.length > 0) {
      console.error('Layout validation failed:', validationErrors)
      return NextResponse.json(
        {
          error: 'Layout generation failed validation',
          validationErrors
        },
        { status: 500 }
      )
    }

    // Delete existing pages if regenerating
    if (regenerate) {
      await supabase
        .from('photo_book_pages')
        .delete()
        .eq('project_id', projectId)
    }

    // Save pages to database
    const pageInserts = result.pages.map(page => ({
      project_id: projectId,
      page_number: page.pageNumber,
      page_type: page.pageType,
      layout_template: page.layoutTemplate,
      layout_json: page,
      photo_ids: page.photos.map(p => p.photoId)
    }))

    const { error: insertError } = await supabase
      .from('photo_book_pages')
      .insert(pageInserts)

    if (insertError) {
      console.error('Failed to save pages:', insertError)
      return NextResponse.json(
        { error: 'Failed to save page layouts' },
        { status: 500 }
      )
    }

    // Update project with page count and status
    await supabase
      .from('photo_book_projects')
      .update({
        page_count: result.totalPages,
        status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    // Create job record
    await supabase
      .from('photo_book_jobs')
      .insert({
        project_id: projectId,
        job_type: 'auto_layout',
        status: 'completed',
        progress_percent: 100,
        started_at: result.metadata.generatedAt.toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: result.metadata.generationTime
      })

    return NextResponse.json({
      success: true,
      totalPages: result.totalPages,
      photosUsed: result.photosUsed,
      photosUnused: result.photosUnused.length,
      warnings: result.warnings,
      generationTime: result.metadata.generationTime,
      pages: result.pages
    }, { status: 201 })
  } catch (error) {
    console.error('Error generating layout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET - Retrieve existing page layouts
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project access
    const { data: project } = await supabase
      .from('photo_book_projects')
      .select('id, page_count, layout_style, page_size')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Get pages
    const { data: pages, error: pagesError } = await supabase
      .from('photo_book_pages')
      .select('*')
      .eq('project_id', projectId)
      .order('page_number', { ascending: true })

    if (pagesError) {
      console.error('Failed to fetch pages:', pagesError)
      return NextResponse.json(
        { error: 'Failed to fetch pages' },
        { status: 500 }
      )
    }

    // Get estimate for comparison
    const { data: photoCount } = await supabase
      .from('photo_book_photos')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId)

    const estimate = estimatePageCount(
      photoCount?.length || 0,
      project.layout_style as LayoutStyle
    )

    return NextResponse.json({
      pages: pages || [],
      totalPages: pages?.length || 0,
      pageCount: project.page_count,
      estimate,
      layoutStyle: project.layout_style,
      pageSize: project.page_size
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching layout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Clear page layouts
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project access
    const { data: project } = await supabase
      .from('photo_book_projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Delete pages
    const { error: deleteError } = await supabase
      .from('photo_book_pages')
      .delete()
      .eq('project_id', projectId)

    if (deleteError) {
      console.error('Failed to delete pages:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete pages' },
        { status: 500 }
      )
    }

    // Update project status
    await supabase
      .from('photo_book_projects')
      .update({
        page_count: 0,
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    return NextResponse.json({
      success: true,
      message: 'Layout cleared'
    }, { status: 200 })
  } catch (error) {
    console.error('Error clearing layout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
