/**
 * Cloud Import Types
 * Common types for cloud storage integrations
 */

/**
 * Supported cloud storage providers
 */
export type CloudProvider = 'google-photos' | 'dropbox' | 'icloud'

/**
 * Cloud file metadata
 */
export interface CloudFile {
  id: string
  name: string
  size: number
  mimeType: string
  thumbnailUrl?: string
  downloadUrl: string
  createdAt: Date
  modifiedAt: Date
  metadata?: {
    width?: number
    height?: number
    dateTaken?: Date
    location?: {
      latitude: number
      longitude: number
    }
    camera?: string
    [key: string]: any
  }
}

/**
 * Cloud folder/album
 */
export interface CloudFolder {
  id: string
  name: string
  itemCount: number
  createdAt?: Date
  thumbnailUrl?: string
}

/**
 * Import session
 */
export interface ImportSession {
  id: string
  provider: CloudProvider
  userId: string
  projectId: string
  status: 'pending' | 'authenticating' | 'listing' | 'importing' | 'completed' | 'failed' | 'cancelled'
  selectedFiles: string[]  // File IDs
  importedCount: number
  totalCount: number
  errors?: ImportError[]
  startedAt: Date
  completedAt?: Date
  metadata?: {
    folderId?: string
    folderName?: string
    [key: string]: any
  }
}

/**
 * Import error
 */
export interface ImportError {
  fileId: string
  fileName: string
  error: string
  timestamp: Date
}

/**
 * Provider authentication
 */
export interface ProviderAuth {
  provider: CloudProvider
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  userId: string
  metadata?: Record<string, any>
}

/**
 * Import options
 */
export interface ImportOptions {
  folderId?: string
  fileIds?: string[]
  includeSubfolders?: boolean
  fileFilter?: {
    mimeTypes?: string[]
    maxSize?: number
    dateRange?: {
      from?: Date
      to?: Date
    }
  }
  downloadOptions?: {
    quality?: 'original' | 'high' | 'medium'
    convertFormat?: string
  }
}

/**
 * Import progress
 */
export interface ImportProgress {
  sessionId: string
  status: ImportSession['status']
  current: number
  total: number
  currentFile?: string
  errors: ImportError[]
  estimatedTimeRemaining?: number
}

/**
 * Base provider interface
 */
export interface CloudImportProvider {
  readonly name: CloudProvider
  readonly displayName: string

  // Authentication
  getAuthUrl(redirectUri: string, state: string): string
  exchangeCodeForToken(code: string, redirectUri: string): Promise<ProviderAuth>
  refreshAuth(auth: ProviderAuth): Promise<ProviderAuth>

  // Listing
  listFolders(auth: ProviderAuth): Promise<CloudFolder[]>
  listFiles(auth: ProviderAuth, options?: ImportOptions): Promise<CloudFile[]>

  // Downloading
  downloadFile(auth: ProviderAuth, fileId: string): Promise<Buffer>
  downloadFiles(auth: ProviderAuth, fileIds: string[]): AsyncGenerator<{
    fileId: string
    fileName: string
    buffer: Buffer
  }, void, undefined>

  // Metadata
  getFileMetadata(auth: ProviderAuth, fileId: string): Promise<CloudFile>
}

/**
 * Batch download result
 */
export interface BatchDownloadResult {
  fileId: string
  fileName: string
  success: boolean
  buffer?: Buffer
  error?: string
}
