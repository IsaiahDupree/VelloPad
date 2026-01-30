/**
 * PB-018: PDF Download Option
 * POST /api/photo-book/projects/[projectId]/download-pdf
 *
 * Generate and return download URL for print-ready photo book PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const supabase = await createClient()

    // Verify user owns this project
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: project } = await supabase
      .from('photo_book_projects')
      .select('id, title, user_id, latest_pdf_url')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    if (project.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Check if PDF exists
    if (!project.latest_pdf_url) {
      return NextResponse.json(
        { success: false, error: 'PDF not yet generated. Please generate the PDF first.' },
        { status: 400 }
      )
    }

    // Create a signed URL with expiration (24 hours)
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('photo-book-pdfs')
      .createSignedUrl(project.latest_pdf_url, 86400) // 24 hours

    if (signedUrlError || !signedUrlData) {
      console.error('[PB-018] Error creating signed URL:', signedUrlError)
      return NextResponse.json(
        { success: false, error: 'Failed to generate download link' },
        { status: 500 }
      )
    }

    // Log the download event for analytics
    try {
      await supabase
        .from('events')
        .insert({
          user_id: user.id,
          event_name: 'photo_book.pdf_downloaded',
          props: {
            project_id: projectId,
            pdf_url: project.latest_pdf_url,
          },
        })
    } catch (err) {
      console.error('[PB-018] Error logging download event:', err)
    }

    return NextResponse.json({
      success: true,
      data: {
        download_url: signedUrlData.signedUrl,
        filename: `${project.title.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        expires_in: 86400, // seconds
      },
    })
  } catch (error) {
    console.error('[PB-018] Error creating download:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
