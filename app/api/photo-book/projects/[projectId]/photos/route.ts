/**
 * Photo Upload API
 * POST /api/photo-book/projects/[projectId]/photos - Upload photos
 * GET /api/photo-book/projects/[projectId]/photos - List photos
 */

import { createClient } from '@/lib/supabase/server'
import { getStorageProvider } from '@/lib/storage'
import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_PHOTOS_PER_PROJECT = 100
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']

interface RouteParams {
  params: Promise<{
    projectId: string
  }>
}

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
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Check photo count limit
    if (project.photo_count >= MAX_PHOTOS_PER_PROJECT) {
      return NextResponse.json({
        error: `Maximum ${MAX_PHOTOS_PER_PROJECT} photos per project`
      }, { status: 400 })
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    // Check total count doesn't exceed limit
    if (project.photo_count + files.length > MAX_PHOTOS_PER_PROJECT) {
      return NextResponse.json({
        error: `Uploading ${files.length} files would exceed limit of ${MAX_PHOTOS_PER_PROJECT} photos`
      }, { status: 400 })
    }

    const storage = getStorageProvider()
    const uploadedPhotos = []
    const errors = []

    // Process each file
    for (const file of files) {
      try {
        // Validate file
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push({ filename: file.name, error: 'Invalid file type' })
          continue
        }

        if (file.size > MAX_FILE_SIZE) {
          errors.push({ filename: file.name, error: 'File too large' })
          continue
        }

        // Generate storage path
        const ext = file.name.split('.').pop()
        const filename = `${project.workspace_id}/photo-books/${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

        // Upload to storage
        const fileBuffer = Buffer.from(await file.arrayBuffer())
        const uploadResult = await storage.upload({
          path: filename,
          file: fileBuffer,
          contentType: file.type
        })

        // Get image dimensions
        const dimensions = await getImageDimensions(fileBuffer)

        // Calculate DPI (assuming 8 inch target)
        const dpi = dimensions.width && dimensions.height
          ? Math.min(dimensions.width, dimensions.height) / 8
          : null

        const isPrintSafe = dpi ? dpi >= 300 : false
        const warnings = []
        if (dpi && dpi < 300) {
          warnings.push(`Low resolution: ${Math.round(dpi)} DPI (300+ recommended)`)
        }

        // Get next sort order
        const { data: lastPhoto } = await supabase
          .from('photo_book_photos')
          .select('sort_order')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .single()

        const sortOrder = (lastPhoto?.sort_order ?? -1) + 1

        // Insert photo record
        const { data: photo, error: insertError } = await supabase
          .from('photo_book_photos')
          .insert({
            project_id: projectId,
            workspace_id: project.workspace_id,
            user_id: user.id,
            filename,
            original_filename: file.name,
            mime_type: file.type,
            file_size: file.size,
            storage_url: uploadResult.url,
            width: dimensions.width,
            height: dimensions.height,
            aspect_ratio: dimensions.width && dimensions.height
              ? dimensions.width / dimensions.height
              : null,
            orientation: getOrientation(dimensions.width, dimensions.height),
            dpi,
            is_print_safe: isPrintSafe,
            quality_warnings: warnings,
            sort_order: sortOrder,
            processed: false
          })
          .select()
          .single()

        if (insertError) {
          console.error('Failed to insert photo:', insertError)
          errors.push({ filename: file.name, error: 'Database error' })
          // Clean up uploaded file
          await storage.delete(filename)
          continue
        }

        uploadedPhotos.push(photo)
      } catch (error) {
        console.error('Error processing file:', error)
        errors.push({ filename: file.name, error: 'Processing error' })
      }
    }

    // Update project status if it was draft
    if (project.status === 'draft' && uploadedPhotos.length > 0) {
      await supabase
        .from('photo_book_projects')
        .update({ status: 'ready' })
        .eq('id', projectId)
    }

    return NextResponse.json({
      success: true,
      uploaded: uploadedPhotos.length,
      failed: errors.length,
      photos: uploadedPhotos,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 201 })
  } catch (error) {
    console.error('Error uploading photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get photos
    const { data: photos, error: fetchError } = await supabase
      .from('photo_book_photos')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (fetchError) {
      console.error('Failed to fetch photos:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
    }

    return NextResponse.json({ photos }, { status: 200 })
  } catch (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
async function getImageDimensions(buffer: Buffer): Promise<{ width: number | null, height: number | null }> {
  // Simple implementation - in production, use sharp or similar
  // This is a placeholder that returns null
  return { width: null, height: null }
}

function getOrientation(width: number | null, height: number | null): string {
  if (!width || !height) return 'unknown'
  const ratio = width / height
  if (ratio > 1.1) return 'landscape'
  if (ratio < 0.9) return 'portrait'
  return 'square'
}
