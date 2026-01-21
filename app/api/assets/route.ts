/**
 * Asset API Routes
 * GET /api/assets - List assets for a workspace
 * POST /api/assets - Upload a new asset
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceAssets, uploadAsset, AssetType } from '@/lib/storage/assets'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }

    // Verify workspace access
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse filters
    const bookId = searchParams.get('bookId') ?? undefined
    const assetType = searchParams.get('assetType') as AssetType | undefined
    const tags = searchParams.get('tags')?.split(',') ?? undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

    const assets = await getWorkspaceAssets(workspaceId, {
      bookId,
      assetType,
      tags,
      limit,
      offset
    })

    return NextResponse.json({ assets })
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const workspaceId = formData.get('workspaceId') as string
    const bookId = formData.get('bookId') as string | undefined
    const tagsString = formData.get('tags') as string | undefined
    const description = formData.get('description') as string | undefined

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }

    const tags = tagsString ? tagsString.split(',').map(t => t.trim()) : undefined

    const asset = await uploadAsset({
      file,
      workspaceId,
      bookId: bookId ?? undefined,
      tags,
      description
    })

    return NextResponse.json({ asset }, { status: 201 })
  } catch (error) {
    console.error('Error uploading asset:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload asset' },
      { status: 500 }
    )
  }
}
