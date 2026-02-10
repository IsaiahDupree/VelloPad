/**
 * Dropbox Provider
 * Import files from Dropbox
 */

import type {
  CloudImportProvider,
  ProviderAuth,
  CloudFolder,
  CloudFile,
  ImportOptions
} from '../types'

export interface DropboxConfig {
  appKey: string
  appSecret: string
}

/**
 * Dropbox Import Provider
 */
export class DropboxProvider implements CloudImportProvider {
  readonly name = 'dropbox' as const
  readonly displayName = 'Dropbox'

  private config: DropboxConfig

  constructor(config: DropboxConfig) {
    this.config = config
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.appKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      token_access_type: 'offline'
    })

    return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<ProviderAuth> {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.config.appKey}:${this.config.appSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to exchange code: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      provider: 'dropbox',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      userId: data.account_id || '',
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

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.config.appKey}:${this.config.appSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        refresh_token: auth.refreshToken,
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
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined
    }
  }

  /**
   * List folders
   */
  async listFolders(auth: ProviderAuth): Promise<CloudFolder[]> {
    const folders: CloudFolder[] = []
    let cursor: string | undefined

    do {
      const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: '',
          recursive: false,
          include_mounted_folders: true
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to list folders: ${response.statusText}`)
      }

      const data = await response.json()

      const folderItems = data.entries.filter((entry: any) => entry['.tag'] === 'folder')

      for (const folder of folderItems) {
        // Get folder metadata to count items
        const itemCount = await this.getFolderItemCount(auth, folder.path_lower)

        folders.push({
          id: folder.id,
          name: folder.name,
          itemCount,
          createdAt: undefined // Dropbox doesn't provide folder creation date in basic API
        })
      }

      cursor = data.has_more ? data.cursor : undefined
    } while (cursor)

    return folders
  }

  /**
   * List files
   */
  async listFiles(auth: ProviderAuth, options?: ImportOptions): Promise<CloudFile[]> {
    const files: CloudFile[] = []
    const path = options?.folderId || ''
    let cursor: string | undefined

    do {
      const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path,
          recursive: options?.includeSubfolders || false,
          limit: 2000
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`)
      }

      const data = await response.json()

      const fileItems = data.entries
        .filter((entry: any) => entry['.tag'] === 'file')
        .map((file: any) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          mimeType: this.getMimeTypeFromName(file.name),
          downloadUrl: file.path_lower,
          createdAt: new Date(file.client_modified),
          modifiedAt: new Date(file.server_modified),
          metadata: {
            rev: file.rev,
            contentHash: file.content_hash
          }
        }))

      files.push(...fileItems)
      cursor = data.has_more ? data.cursor : undefined
    } while (cursor)

    return this.applyFileFilter(files, options)
  }

  /**
   * Download a single file
   */
  async downloadFile(auth: ProviderAuth, fileId: string): Promise<Buffer> {
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: fileId // fileId is the path
        })
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
    const response = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: fileId
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to get file metadata: ${response.statusText}`)
    }

    const file = await response.json()

    return {
      id: file.id,
      name: file.name,
      size: file.size,
      mimeType: this.getMimeTypeFromName(file.name),
      downloadUrl: file.path_lower,
      createdAt: new Date(file.client_modified),
      modifiedAt: new Date(file.server_modified),
      metadata: {
        rev: file.rev,
        contentHash: file.content_hash
      }
    }
  }

  /**
   * Get folder item count
   */
  private async getFolderItemCount(auth: ProviderAuth, folderPath: string): Promise<number> {
    try {
      const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: folderPath,
          recursive: false,
          limit: 1
        })
      })

      if (!response.ok) {
        return 0
      }

      const data = await response.json()
      return data.entries.length
    } catch {
      return 0
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeTypeFromName(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()

    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'pdf': 'application/pdf'
    }

    return mimeTypes[ext || ''] || 'application/octet-stream'
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
 * Create Dropbox provider instance
 */
export function createDropboxProvider(config: DropboxConfig): DropboxProvider {
  return new DropboxProvider(config)
}
