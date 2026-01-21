/**
 * Single Asset API Routes
 * GET /api/assets/[assetId] - Get asset details
 * PATCH /api/assets/[assetId] - Update asset metadata
 * DELETE /api/assets/[assetId] - Delete asset
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAsset, updateAsset, deleteAsset } from '@/lib/storage/assets'
import { createClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{
    assetId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId } = await params
    const asset = await getAsset(assetId)

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Verify workspace access
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', asset.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ asset })
  } catch (error) {
    console.error('Error fetching asset:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch asset' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId } = await params
    const asset = await getAsset(assetId)

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Only owner can update asset
    if (asset.user_id !== user.id) {
      return NextResponse.json({ error: 'Only asset owner can update it' }, { status: 403 })
    }

    const body = await request.json()
    const { tags, description } = body

    const updatedAsset = await updateAsset(assetId, {
      tags,
      description
    })

    return NextResponse.json({ asset: updatedAsset })
  } catch (error) {
    console.error('Error updating asset:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update asset' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId } = await params
    const asset = await getAsset(assetId)

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Only owner can delete asset
    if (asset.user_id !== user.id) {
      return NextResponse.json({ error: 'Only asset owner can delete it' }, { status: 403 })
    }

    await deleteAsset(assetId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting asset:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete asset' },
      { status: 500 }
    )
  }
}
