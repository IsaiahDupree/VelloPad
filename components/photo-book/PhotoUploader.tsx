'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Image as ImageIcon, X, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface PhotoUploaderProps {
  projectId: string
  onUploadComplete?: (photos: any[]) => void
  maxFiles?: number
  maxSize?: number
}

interface UploadingFile {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  preview?: string
}

export function PhotoUploader({
  projectId,
  onUploadComplete,
  maxFiles = 100,
  maxSize = 50 * 1024 * 1024 // 50MB
}: PhotoUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    // Create initial state for all files
    const newFiles: UploadingFile[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending',
      preview: URL.createObjectURL(file)
    }))

    setUploadingFiles(prev => [...prev, ...newFiles])
    setIsUploading(true)

    try {
      // Create form data
      const formData = new FormData()
      acceptedFiles.forEach(file => {
        formData.append('files', file)
      })

      // Upload with progress tracking
      const response = await fetch(`/api/photo-book/projects/${projectId}/photos`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      // Update status to success
      setUploadingFiles(prev =>
        prev.map((item, index) => {
          const uploadedPhoto = result.photos[index]
          if (uploadedPhoto) {
            return { ...item, progress: 100, status: 'success' }
          }
          const error = result.errors?.find((e: any) => e.filename === item.file.name)
          return {
            ...item,
            progress: 100,
            status: error ? 'error' : 'success',
            error: error?.error
          }
        })
      )

      // Callback with uploaded photos
      if (onUploadComplete && result.photos) {
        onUploadComplete(result.photos)
      }

      // Clear successful uploads after a delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(item => item.status === 'error'))
      }, 3000)
    } catch (error) {
      console.error('Upload error:', error)

      // Mark all as error
      setUploadingFiles(prev =>
        prev.map(item => ({
          ...item,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        }))
      )
    } finally {
      setIsUploading(false)
    }
  }, [projectId, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic']
    },
    maxFiles,
    maxSize,
    disabled: isUploading
  })

  const removeFile = (index: number) => {
    setUploadingFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const totalFiles = uploadingFiles.length
  const successCount = uploadingFiles.filter(f => f.status === 'success').length
  const errorCount = uploadingFiles.filter(f => f.status === 'error').length
  const overallProgress = totalFiles > 0
    ? Math.round(
        (uploadingFiles.reduce((sum, f) => sum + f.progress, 0) / totalFiles)
      )
    : 0

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-gray-100 rounded-full">
            <Upload className="w-8 h-8 text-gray-600" />
          </div>

          <div>
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop photos here' : 'Drag and drop photos'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              or click to browse
            </p>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>Supported: JPG, PNG, WebP, HEIC</p>
            <p>Max {maxFiles} photos, up to {Math.round(maxSize / 1024 / 1024)}MB each</p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {totalFiles > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {isUploading ? 'Uploading...' : 'Upload Complete'}
            </span>
            <span className="text-gray-600">
              {successCount} / {totalFiles} uploaded
              {errorCount > 0 && ` (${errorCount} failed)`}
            </span>
          </div>

          <Progress value={overallProgress} className="h-2" />

          {/* File List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploadingFiles.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                {/* Preview */}
                <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded overflow-hidden">
                  {item.preview ? (
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-full h-full p-2 text-gray-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {item.error && (
                    <p className="text-xs text-red-600 mt-1">{item.error}</p>
                  )}
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  {item.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  {item.status === 'uploading' && (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* Remove button */}
                {item.status !== 'uploading' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
