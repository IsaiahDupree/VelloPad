/**
 * AWS S3 Storage Provider
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, GetObjectCommandInput } from '@aws-sdk/client-s3'
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageProvider, UploadParams, UploadResult, StorageFile } from '../index'

export class S3StorageProvider implements StorageProvider {
  name = 's3'
  private client: S3Client
  private bucket: string
  private region: string
  private publicUrl?: string

  constructor() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    const region = process.env.AWS_REGION || 'us-east-1'
    const bucket = process.env.AWS_S3_BUCKET

    if (!accessKeyId || !secretAccessKey || !bucket) {
      throw new Error('AWS S3 credentials not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET')
    }

    this.bucket = bucket
    this.region = region
    this.publicUrl = process.env.AWS_S3_PUBLIC_URL

    this.client = new S3Client({
      region,
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
      return `${this.publicUrl}/${path}`
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${path}`
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
      contentType: undefined // S3 doesn't return content type in list
    }))
  }
}
