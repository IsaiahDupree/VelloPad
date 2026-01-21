/**
 * Supabase Storage Provider
 */

import { createClient } from '@/lib/supabase/server'
import type { StorageProvider, UploadParams, UploadResult, StorageFile } from '../index'

export class SupabaseStorageProvider implements StorageProvider {
  name = 'supabase'
  private bucket: string

  constructor(bucket: string = 'assets') {
    this.bucket = bucket
  }

  async upload(params: UploadParams): Promise<UploadResult> {
    const supabase = await createClient()

    const { path, file, contentType, cacheControl = '3600', upsert = false } = params

    // Convert to buffer if needed
    let fileData: Buffer | Blob
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      fileData = Buffer.from(arrayBuffer)
    } else {
      fileData = file
    }

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(path, fileData, {
        contentType: contentType || 'application/octet-stream',
        cacheControl,
        upsert
      })

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`)
    }

    const url = this.getPublicUrl(path)

    return {
      path: data.path,
      url,
      size: fileData instanceof Buffer ? fileData.length : (fileData as Blob).size,
      contentType: contentType || 'application/octet-stream'
    }
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    return data.signedUrl
  }

  getPublicUrl(path: string): string {
    // Note: This is a synchronous operation, but we keep it as a regular method
    // to maintain interface consistency
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
    }

    return `${supabaseUrl}/storage/v1/object/public/${this.bucket}/${path}`
  }

  async delete(path: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.storage
      .from(this.bucket)
      .remove([path])

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  }

  async deleteMultiple(paths: string[]): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.storage
      .from(this.bucket)
      .remove(paths)

    if (error) {
      throw new Error(`Failed to delete files: ${error.message}`)
    }
  }

  async list(prefix: string): Promise<StorageFile[]> {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .list(prefix)

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }

    return data.map(file => ({
      path: `${prefix}/${file.name}`,
      size: file.metadata?.size || 0,
      lastModified: new Date(file.created_at || Date.now()),
      contentType: file.metadata?.mimetype
    }))
  }
}
