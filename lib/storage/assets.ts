/**
 * Asset storage utilities
 * Handles uploading, retrieving, and managing assets in Supabase Storage
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export type AssetType = 'image' | 'font' | 'template' | 'other'

export interface Asset {
  id: string
  workspace_id: string
  book_id: string | null
  user_id: string
  filename: string
  original_filename: string
  asset_type: AssetType
  mime_type: string
  file_size: number
  storage_path: string
  storage_url: string | null
  width: number | null
  height: number | null
  dpi: number | null
  color_space: string | null
  is_print_safe: boolean
  print_quality_warnings: string[]
  usage_count: number
  last_used_at: string | null
  tags: string[]
  description: string | null
  created_at: string
  updated_at: string
}

export interface UploadAssetParams {
  file: File
  workspaceId: string
  bookId?: string
  tags?: string[]
  description?: string
}

export interface AssetMetadata {
  width?: number
  height?: number
  dpi?: number
  colorSpace?: string
}

const ASSETS_BUCKET = 'assets'
const MIN_PRINT_DPI = 300

/**
 * Calculate DPI from image dimensions and target print size
 */
function calculateDPI(width: number, height: number, targetInches: number = 6): number {
  const shortestSide = Math.min(width, height)
  return shortestSide / targetInches
}

/**
 * Determine if image is print-safe based on DPI
 */
function isPrintSafe(dpi: number | null): boolean {
  return dpi !== null && dpi >= MIN_PRINT_DPI
}

/**
 * Generate print quality warnings
 */
function generatePrintWarnings(width: number | null, height: number | null, dpi: number | null): string[] {
  const warnings: string[] = []

  if (dpi && dpi < MIN_PRINT_DPI) {
    warnings.push(`Low resolution: ${Math.round(dpi)} DPI (recommended: ${MIN_PRINT_DPI}+ DPI for print)`)
  }

  if (width && height) {
    const mp = (width * height) / 1000000
    if (mp < 2) {
      warnings.push(`Small image size: ${width}x${height}px (${mp.toFixed(1)}MP)`)
    }
  }

  return warnings
}

/**
 * Get image metadata from file
 */
async function getImageMetadata(file: File): Promise<AssetMetadata> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const width = img.naturalWidth
      const height = img.naturalHeight
      const dpi = calculateDPI(width, height)

      URL.revokeObjectURL(url)

      resolve({
        width,
        height,
        dpi,
        colorSpace: 'RGB' // Default, would need more complex detection for actual color space
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({})
    }

    img.src = url
  })
}

/**
 * Upload an asset (server-side)
 */
export async function uploadAsset(params: UploadAssetParams): Promise<Asset> {
  const supabase = await createClient()

  const { file, workspaceId, bookId, tags = [], description } = params

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  // Verify workspace access
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    throw new Error('You do not have access to this workspace')
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const filename = `${workspaceId}/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(ASSETS_BUCKET)
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(ASSETS_BUCKET)
    .getPublicUrl(filename)

  // Get image metadata if it's an image
  let metadata: AssetMetadata = {}
  if (file.type.startsWith('image/')) {
    metadata = await getImageMetadata(file)
  }

  const dpi = metadata.dpi ?? null
  const printSafe = isPrintSafe(dpi)
  const warnings = generatePrintWarnings(metadata.width ?? null, metadata.height ?? null, dpi)

  // Determine asset type
  let assetType: AssetType = 'other'
  if (file.type.startsWith('image/')) assetType = 'image'
  else if (file.type.includes('font')) assetType = 'font'

  // Insert asset record
  const { data: asset, error: insertError } = await supabase
    .from('assets')
    .insert({
      workspace_id: workspaceId,
      book_id: bookId ?? null,
      user_id: user.id,
      filename: uploadData.path,
      original_filename: file.name,
      asset_type: assetType,
      mime_type: file.type,
      file_size: file.size,
      storage_path: filename,
      storage_url: publicUrl,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      dpi,
      color_space: metadata.colorSpace ?? null,
      is_print_safe: printSafe,
      print_quality_warnings: warnings,
      tags,
      description
    })
    .select()
    .single()

  if (insertError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from(ASSETS_BUCKET).remove([filename])
    throw new Error(`Failed to create asset record: ${insertError.message}`)
  }

  return asset as Asset
}

/**
 * Get assets for a workspace
 */
export async function getWorkspaceAssets(workspaceId: string, filters?: {
  bookId?: string
  assetType?: AssetType
  tags?: string[]
  limit?: number
  offset?: number
}): Promise<Asset[]> {
  const supabase = await createClient()

  let query = supabase
    .from('assets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (filters?.bookId) {
    query = query.eq('book_id', filters.bookId)
  }

  if (filters?.assetType) {
    query = query.eq('asset_type', filters.assetType)
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch assets: ${error.message}`)
  }

  return data as Asset[]
}

/**
 * Get a single asset by ID
 */
export async function getAsset(assetId: string): Promise<Asset | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch asset: ${error.message}`)
  }

  return data as Asset
}

/**
 * Update asset metadata
 */
export async function updateAsset(
  assetId: string,
  updates: {
    tags?: string[]
    description?: string
  }
): Promise<Asset> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', assetId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update asset: ${error.message}`)
  }

  return data as Asset
}

/**
 * Delete an asset
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const supabase = await createClient()

  // Get asset to find storage path
  const asset = await getAsset(assetId)
  if (!asset) {
    throw new Error('Asset not found')
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(ASSETS_BUCKET)
    .remove([asset.storage_path])

  if (storageError) {
    console.error('Failed to delete from storage:', storageError)
    // Continue with database deletion even if storage delete fails
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('assets')
    .delete()
    .eq('id', assetId)

  if (dbError) {
    throw new Error(`Failed to delete asset: ${dbError.message}`)
  }
}

/**
 * Increment asset usage count
 */
export async function incrementAssetUsage(assetId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('assets')
    .update({
      usage_count: supabase.rpc('increment', { row_id: assetId }),
      last_used_at: new Date().toISOString()
    })
    .eq('id', assetId)

  if (error) {
    console.error('Failed to increment asset usage:', error)
  }
}

/**
 * Get asset storage stats for workspace
 */
export async function getWorkspaceStorageStats(workspaceId: string): Promise<{
  totalAssets: number
  totalSize: number
  assetsByType: Record<AssetType, number>
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assets')
    .select('asset_type, file_size')
    .eq('workspace_id', workspaceId)

  if (error) {
    throw new Error(`Failed to fetch storage stats: ${error.message}`)
  }

  const totalSize = data.reduce((sum, asset) => sum + asset.file_size, 0)
  const assetsByType = data.reduce((acc, asset) => {
    const type = asset.asset_type as AssetType
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<AssetType, number>)

  return {
    totalAssets: data.length,
    totalSize,
    assetsByType
  }
}
