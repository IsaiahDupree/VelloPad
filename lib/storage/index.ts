/**
 * Storage abstraction layer
 * Supports multiple storage backends: Supabase Storage, AWS S3, Cloudflare R2
 */

export interface StorageProvider {
  name: string
  upload(params: UploadParams): Promise<UploadResult>
  getSignedUrl(path: string, expiresIn?: number): Promise<string>
  getPublicUrl(path: string): string
  delete(path: string): Promise<void>
  deleteMultiple(paths: string[]): Promise<void>
  list(prefix: string): Promise<StorageFile[]>
}

export interface UploadParams {
  path: string
  file: Buffer | File | Blob
  contentType?: string
  metadata?: Record<string, string>
  cacheControl?: string
  upsert?: boolean
}

export interface UploadResult {
  path: string
  url: string
  size: number
  contentType: string
}

export interface StorageFile {
  path: string
  size: number
  lastModified: Date
  contentType?: string
}

export type StorageType = 'supabase' | 's3' | 'r2'

export function getStorageProvider(type?: StorageType): StorageProvider {
  const storageType = type || (process.env.STORAGE_PROVIDER as StorageType) || 'supabase'

  switch (storageType) {
    case 'supabase':
      return getSupabaseStorage()
    case 's3':
      return getS3Storage()
    case 'r2':
      return getR2Storage()
    default:
      throw new Error(`Unknown storage provider: ${storageType}`)
  }
}

function getSupabaseStorage(): StorageProvider {
  const { SupabaseStorageProvider } = require('./providers/supabase')
  return new SupabaseStorageProvider()
}

function getS3Storage(): StorageProvider {
  const { S3StorageProvider } = require('./providers/s3')
  return new S3StorageProvider()
}

function getR2Storage(): StorageProvider {
  const { R2StorageProvider } = require('./providers/r2')
  return new R2StorageProvider()
}

export * from './providers/supabase'
export * from './providers/s3'
export * from './providers/r2'
