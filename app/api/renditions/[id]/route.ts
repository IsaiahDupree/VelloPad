/**
 * Individual Rendition API Endpoint
 * Feature: BS-401
 *
 * GET /api/renditions/[id] - Get rendition status
 * DELETE /api/renditions/[id] - Cancel rendition
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRenditionStatus, cancelRendition } from '@/lib/rendition/queue'

// ============================================================================
// GET /api/renditions/[id]
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const renditionId = id

    // Get rendition with access check (RLS handles this)
    const rendition = await getRenditionStatus(renditionId)

    if (!rendition) {
      return NextResponse.json({ error: 'Rendition not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      rendition,
    })
  } catch (error: any) {
    console.error('Failed to fetch rendition:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch rendition',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE /api/renditions/[id]
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const renditionId = id

    // Verify access
    const { data: rendition, error: renditionError } = await supabase
      .from('renditions')
      .select('workspace_id')
      .eq('id', renditionId)
      .single()

    if (renditionError || !rendition) {
      return NextResponse.json({ error: 'Rendition not found' }, { status: 404 })
    }

    // Cancel rendition and remove jobs
    await cancelRendition(renditionId)

    return NextResponse.json({
      success: true,
      message: 'Rendition cancelled',
    })
  } catch (error: any) {
    console.error('Failed to cancel rendition:', error)
    return NextResponse.json(
      {
        error: 'Failed to cancel rendition',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
