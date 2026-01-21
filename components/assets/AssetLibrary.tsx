'use client'

/**
 * Asset Library Component
 * Upload, view, and manage assets (images, fonts, etc.)
 * Features: drag-drop upload, preview, metadata, print quality warnings
 */

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Upload, Image, FileText, Trash2, Edit, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Asset {
  id: string
  workspace_id: string
  book_id: string | null
  user_id: string
  filename: string
  original_filename: string
  asset_type: 'image' | 'font' | 'template' | 'other'
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

interface AssetLibraryProps {
  workspaceId: string
  bookId?: string
  onAssetSelect?: (asset: Asset) => void
}

export function AssetLibrary({ workspaceId, bookId, onAssetSelect }: AssetLibraryProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'image' | 'font' | 'other'>('all')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ workspaceId })
      if (bookId) params.append('bookId', bookId)
      if (filter !== 'all') params.append('assetType', filter)

      const response = await fetch(`/api/assets?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch assets')
      }

      setAssets(data.assets)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, bookId, filter])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  // Upload asset
  const uploadAsset = async (file: File) => {
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspaceId', workspaceId)
      if (bookId) formData.append('bookId', bookId)

      const response = await fetch('/api/assets', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload asset')
      }

      await fetchAssets()
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload asset')
    } finally {
      setUploading(false)
    }
  }

  // Delete asset
  const deleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete asset')
      }

      await fetchAssets()
      setSelectedAsset(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete asset')
    }
  }

  // Dropzone for file upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => uploadAsset(file))
  }, [workspaceId, bookId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: uploading
  })

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Assets</CardTitle>
          <CardDescription>
            Drag and drop images or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop files here...</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  {uploading ? 'Uploading...' : 'Drag & drop files here'}
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse (max 50MB)
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          All
        </Button>
        <Button
          variant={filter === 'image' ? 'default' : 'outline'}
          onClick={() => setFilter('image')}
          size="sm"
        >
          Images
        </Button>
        <Button
          variant={filter === 'font' ? 'default' : 'outline'}
          onClick={() => setFilter('font')}
          size="sm"
        >
          Fonts
        </Button>
        <Button
          variant={filter === 'other' ? 'default' : 'outline'}
          onClick={() => setFilter('other')}
          size="sm"
        >
          Other
        </Button>
      </div>

      {/* Asset Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading assets...</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12">
          <Image className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No assets yet. Upload some files to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <Card
              key={asset.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedAsset(asset)}
            >
              <CardContent className="p-4">
                {/* Thumbnail */}
                {asset.asset_type === 'image' && asset.storage_url ? (
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                    <img
                      src={asset.storage_url}
                      alt={asset.original_filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-400" />
                  </div>
                )}

                {/* Filename */}
                <p className="text-sm font-medium truncate mb-1">
                  {asset.original_filename}
                </p>

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatFileSize(asset.file_size)}</span>
                  {asset.width && asset.height && (
                    <span>{asset.width}x{asset.height}</span>
                  )}
                </div>

                {/* Print Quality Badge */}
                {asset.asset_type === 'image' && (
                  <div className="mt-2">
                    <Badge
                      variant={asset.is_print_safe ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {asset.is_print_safe ? 'Print Safe' : 'Low Resolution'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{selectedAsset.original_filename}</CardTitle>
                <CardDescription>
                  Uploaded {new Date(selectedAsset.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedAsset(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview */}
              {selectedAsset.asset_type === 'image' && selectedAsset.storage_url && (
                <div className="bg-gray-100 rounded-lg p-4">
                  <img
                    src={selectedAsset.storage_url}
                    alt={selectedAsset.original_filename}
                    className="max-w-full h-auto mx-auto"
                  />
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">File Size</p>
                  <p>{formatFileSize(selectedAsset.file_size)}</p>
                </div>
                {selectedAsset.width && selectedAsset.height && (
                  <div>
                    <p className="font-medium text-gray-700">Dimensions</p>
                    <p>{selectedAsset.width} x {selectedAsset.height}px</p>
                  </div>
                )}
                {selectedAsset.dpi && (
                  <div>
                    <p className="font-medium text-gray-700">DPI</p>
                    <p>{Math.round(selectedAsset.dpi)} DPI</p>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-700">Type</p>
                  <p className="capitalize">{selectedAsset.asset_type}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Usage Count</p>
                  <p>{selectedAsset.usage_count} times</p>
                </div>
              </div>

              {/* Print Quality Warnings */}
              {selectedAsset.print_quality_warnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Print Quality Issues</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {selectedAsset.print_quality_warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {onAssetSelect && (
                  <Button
                    onClick={() => {
                      onAssetSelect(selectedAsset)
                      setSelectedAsset(null)
                    }}
                  >
                    Select Asset
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => deleteAsset(selectedAsset.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
