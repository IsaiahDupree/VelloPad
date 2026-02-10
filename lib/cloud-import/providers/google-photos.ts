/**
 * Google Photos Provider
 * Import photos from Google Photos
 */

import type {
  CloudImportProvider,
  ProviderAuth,
  CloudFolder,
  CloudFile,
  ImportOptions
} from '../types'

export interface GooglePhotosConfig {
  clientId: string
  clientSecret: string
  scopes?: string[]
}

/**
 * Google Photos Import Provider
 */
export class GooglePhotosProvider implements CloudImportProvider {
  readonly name = 'google-photos' as const
  readonly displayName = 'Google Photos'

  private config: GooglePhotosConfig

  constructor(config: GooglePhotosConfig) {
    this.config = {
      scopes: ['https://www.googleapis.com/auth/photoslibrary.readonly'],
      ...config
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.config.scopes!.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent'
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<ProviderAuth> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to exchange code: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      provider: 'google-photos',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      userId: '', // Will be filled by user info request
      metadata: {
        tokenType: data.token_type,
        scope: data.scope
      }
    }
  }

  /**
   * Refresh access token
   */
  async refreshAuth(auth: ProviderAuth): Promise<ProviderAuth> {
    if (!auth.refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        refresh_token: auth.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      ...auth,
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    }
  }

  /**
   * List albums (folders)
   */
  async listFolders(auth: ProviderAuth): Promise<CloudFolder[]> {
    const response = await fetch('https://photoslibrary.googleapis.com/v1/albums', {
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to list albums: ${response.statusText}`)
    }

    const data = await response.json()

    return (data.albums || []).map((album: any) => ({
      id: album.id,
      name: album.title,
      itemCount: parseInt(album.mediaItemsCount, 10),
      thumbnailUrl: album.coverPhotoBaseUrl,
      createdAt: undefined // Google Photos doesn't provide album creation date
    }))
  }

  /**
   * List media items (files)
   */
  async listFiles(auth: ProviderAuth, options?: ImportOptions): Promise<CloudFile[]> {
    const files: CloudFile[] = []
    let pageToken: string | undefined

    do {
      const params = new URLSearchParams({
        pageSize: '100'
      })

      if (pageToken) {
        params.append('pageToken', pageToken)
      }

      if (options?.folderId) {
        params.append('albumId', options.folderId)
      }

      const url = options?.folderId
        ? `https://photoslibrary.googleapis.com/v1/mediaItems:search`
        : `https://photoslibrary.googleapis.com/v1/mediaItems?${params.toString()}`

      const response = await fetch(url, {
        method: options?.folderId ? 'POST' : 'GET',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: options?.folderId ? JSON.stringify({
          albumId: options.folderId,
          pageSize: 100,
          pageToken
        }) : undefined
      })

      if (!response.ok) {
        throw new Error(`Failed to list media items: ${response.statusText}`)
      }

      const data = await response.json()

      const items = (data.mediaItems || []).map((item: any) => ({
        id: item.id,
        name: item.filename,
        size: 0, // Google Photos doesn't provide size in list
        mimeType: item.mimeType,
        thumbnailUrl: `${item.baseUrl}=w200-h200`,
        downloadUrl: `${item.baseUrl}=d`, // Download URL
        createdAt: new Date(item.mediaMetadata.creationTime),
        modifiedAt: new Date(item.mediaMetadata.creationTime),
        metadata: {
          width: parseInt(item.mediaMetadata.width, 10),
          height: parseInt(item.mediaMetadata.height, 10),
          dateTaken: new Date(item.mediaMetadata.creationTime),
          camera: item.mediaMetadata.cameraMake
            ? `${item.mediaMetadata.cameraMake} ${item.mediaMetadata.cameraModel}`
            : undefined
        }
      }))

      files.push(...items)
      pageToken = data.nextPageToken
    } while (pageToken)

    return this.applyFileFilter(files, options)
  }

  /**
   * Download a single file
   */
  async downloadFile(auth: ProviderAuth, fileId: string): Promise<Buffer> {
    const file = await this.getFileMetadata(auth, fileId)

    const response = await fetch(file.downloadUrl, {
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Download multiple files
   */
  async *downloadFiles(auth: ProviderAuth, fileIds: string[]): AsyncGenerator<{
    fileId: string
    fileName: string
    buffer: Buffer
  }> {
    for (const fileId of fileIds) {
      try {
        const file = await this.getFileMetadata(auth, fileId)
        const buffer = await this.downloadFile(auth, fileId)

        yield {
          fileId,
          fileName: file.name,
          buffer
        }
      } catch (error) {
        console.error(`Failed to download file ${fileId}:`, error)
        // Continue with next file
      }
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(auth: ProviderAuth, fileId: string): Promise<CloudFile> {
    const response = await fetch(`https://photoslibrary.googleapis.com/v1/mediaItems/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get file metadata: ${response.statusText}`)
    }

    const item = await response.json()

    return {
      id: item.id,
      name: item.filename,
      size: 0,
      mimeType: item.mimeType,
      thumbnailUrl: `${item.baseUrl}=w200-h200`,
      downloadUrl: `${item.baseUrl}=d`,
      createdAt: new Date(item.mediaMetadata.creationTime),
      modifiedAt: new Date(item.mediaMetadata.creationTime),
      metadata: {
        width: parseInt(item.mediaMetadata.width, 10),
        height: parseInt(item.mediaMetadata.height, 10),
        dateTaken: new Date(item.mediaMetadata.creationTime),
        camera: item.mediaMetadata.cameraMake
          ? `${item.mediaMetadata.cameraMake} ${item.mediaMetadata.cameraModel}`
          : undefined
      }
    }
  }

  /**
   * Apply file filters
   */
  private applyFileFilter(files: CloudFile[], options?: ImportOptions): CloudFile[] {
    if (!options?.fileFilter) {
      return files
    }

    const { mimeTypes, maxSize, dateRange } = options.fileFilter

    return files.filter(file => {
      // MIME type filter
      if (mimeTypes && !mimeTypes.some(type => file.mimeType.includes(type))) {
        return false
      }

      // Size filter
      if (maxSize && file.size > maxSize) {
        return false
      }

      // Date range filter
      if (dateRange) {
        if (dateRange.from && file.createdAt < dateRange.from) {
          return false
        }
        if (dateRange.to && file.createdAt > dateRange.to) {
          return false
        }
      }

      return true
    })
  }
}

/**
 * Create Google Photos provider instance
 */
export function createGooglePhotosProvider(config: GooglePhotosConfig): GooglePhotosProvider {
  return new GooglePhotosProvider(config)
}
