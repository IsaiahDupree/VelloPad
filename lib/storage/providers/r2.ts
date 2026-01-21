/**
 * Cloudflare R2 Storage Provider
 * R2 is S3-compatible but uses different endpoint format
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageProvider, UploadParams, UploadResult, StorageFile } from '../index'

export class R2StorageProvider implements StorageProvider {
  name = 'r2'
  private client: S3Client
  private bucket: string
  private accountId: string
  private publicUrl?: string

  constructor() {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const accountId = process.env.R2_ACCOUNT_ID
    const bucket = process.env.R2_BUCKET_NAME
    const publicUrl = process.env.R2_PUBLIC_URL

    if (!accessKeyId || !secretAccessKey || !accountId || !bucket) {
      throw new Error('R2 credentials not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, and R2_BUCKET_NAME')
    }

    this.bucket = bucket
    this.accountId = accountId
    this.publicUrl = publicUrl

    // R2 uses S3-compatible API but with Cloudflare endpoints
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    })
  }

  async upload(params: UploadParams): Promise<UploadResult> {
    const { path, file, contentType, metadata } = params

    // Convert to buffer if needed
    let body: Buffer
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      body = Buffer.from(arrayBuffer)
    } else if (file instanceof Blob) {
      const arrayBuffer = await file.arrayBuffer()
      body = Buffer.from(arrayBuffer)
    } else {
      body = file
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
      Metadata: metadata
    })

    await this.client.send(command)

    const url = this.getPublicUrl(path)

    return {
      path,
      url,
      size: body.length,
      contentType: contentType || 'application/octet-stream'
    }
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path
    })

    return getS3SignedUrl(this.client, command, { expiresIn })
  }

  getPublicUrl(path: string): string {
    if (this.publicUrl) {
      // Use custom domain if configured
      return `${this.publicUrl}/${path}`
    }
    // Default R2 public URL format
    return `https://pub-${this.accountId}.r2.dev/${path}`
  }

  async delete(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path
    })

    await this.client.send(command)
  }

  async deleteMultiple(paths: string[]): Promise<void> {
    if (paths.length === 0) return

    const command = new DeleteObjectsCommand({
      Bucket: this.bucket,
      Delete: {
        Objects: paths.map(path => ({ Key: path }))
      }
    })

    await this.client.send(command)
  }

  async list(prefix: string): Promise<StorageFile[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix
    })

    const response = await this.client.send(command)

    return (response.Contents || []).map(obj => ({
      path: obj.Key || '',
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
      contentType: undefined // R2 doesn't return content type in list
    }))
  }
}
