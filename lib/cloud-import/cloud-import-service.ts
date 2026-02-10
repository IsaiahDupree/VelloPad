/**
 * Cloud Import Service
 * Main service for managing cloud storage imports
 */

import type {
  CloudProvider,
  CloudImportProvider,
  ProviderAuth,
  ImportSession,
  ImportOptions,
  ImportProgress,
  CloudFile,
  ImportError
} from './types'
import { GooglePhotosProvider } from './providers/google-photos'
import { DropboxProvider } from './providers/dropbox'
import { ICloudProvider } from './providers/icloud'

/**
 * Cloud Import Service Configuration
 */
export interface CloudImportServiceConfig {
  googlePhotos?: {
    clientId: string
    clientSecret: string
  }
  dropbox?: {
    appKey: string
    appSecret: string
  }
  icloud?: {
    apiKey?: string
    apiSecret?: string
  }
}

/**
 * Cloud Import Service
 * Manages imports from multiple cloud providers
 */
export class CloudImportService {
  private providers: Map<CloudProvider, CloudImportProvider>
  private activeSessions: Map<string, ImportSession>

  constructor(config: CloudImportServiceConfig) {
    this.providers = new Map()
    this.activeSessions = new Map()

    // Initialize providers
    if (config.googlePhotos) {
      this.providers.set('google-photos', new GooglePhotosProvider(config.googlePhotos))
    }

    if (config.dropbox) {
      this.providers.set('dropbox', new DropboxProvider(config.dropbox))
    }

    if (config.icloud) {
      this.providers.set('icloud', new ICloudProvider(config.icloud))
    }
  }

  /**
   * Get provider instance
   */
  getProvider(provider: CloudProvider): CloudImportProvider {
    const providerInstance = this.providers.get(provider)

    if (!providerInstance) {
      throw new Error(`Provider ${provider} is not configured`)
    }

    return providerInstance
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(provider: CloudProvider): boolean {
    return this.providers.has(provider)
  }

  /**
   * Get authorization URL for a provider
   */
  getAuthUrl(provider: CloudProvider, redirectUri: string, state: string): string {
    const providerInstance = this.getProvider(provider)
    return providerInstance.getAuthUrl(redirectUri, state)
  }

  /**
   * Exchange authorization code for access token
   */
  async authenticateProvider(
    provider: CloudProvider,
    code: string,
    redirectUri: string
  ): Promise<ProviderAuth> {
    const providerInstance = this.getProvider(provider)
    return await providerInstance.exchangeCodeForToken(code, redirectUri)
  }

  /**
   * Refresh provider authentication
   */
  async refreshProviderAuth(auth: ProviderAuth): Promise<ProviderAuth> {
    const providerInstance = this.getProvider(auth.provider)
    return await providerInstance.refreshAuth(auth)
  }

  /**
   * List folders/albums from a provider
   */
  async listFolders(auth: ProviderAuth) {
    const providerInstance = this.getProvider(auth.provider)
    return await providerInstance.listFolders(auth)
  }

  /**
   * List files from a provider
   */
  async listFiles(auth: ProviderAuth, options?: ImportOptions) {
    const providerInstance = this.getProvider(auth.provider)
    return await providerInstance.listFiles(auth, options)
  }

  /**
   * Create import session
   */
  async createImportSession(
    provider: CloudProvider,
    userId: string,
    projectId: string,
    fileIds: string[],
    options?: ImportOptions
  ): Promise<ImportSession> {
    const sessionId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const session: ImportSession = {
      id: sessionId,
      provider,
      userId,
      projectId,
      status: 'pending',
      selectedFiles: fileIds,
      importedCount: 0,
      totalCount: fileIds.length,
      startedAt: new Date(),
      metadata: {
        folderId: options?.folderId
      }
    }

    this.activeSessions.set(sessionId, session)

    return session
  }

  /**
   * Start importing files
   */
  async startImport(
    sessionId: string,
    auth: ProviderAuth,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId)

    if (!session) {
      throw new Error(`Import session ${sessionId} not found`)
    }

    // Update session status
    session.status = 'importing'
    this.activeSessions.set(sessionId, session)

    const providerInstance = this.getProvider(session.provider)
    const errors: ImportError[] = []

    // Download files
    let importedCount = 0

    for await (const result of providerInstance.downloadFiles(auth, session.selectedFiles)) {
      try {
        // TODO: Upload to storage and create photo record
        // For now, just count successful downloads

        importedCount++
        session.importedCount = importedCount

        // Report progress
        if (onProgress) {
          onProgress({
            sessionId,
            status: 'importing',
            current: importedCount,
            total: session.totalCount,
            currentFile: result.fileName,
            errors
          })
        }
      } catch (error) {
        errors.push({
          fileId: result.fileId,
          fileName: result.fileName,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        })
      }
    }

    // Update final session status
    session.status = errors.length > 0 && importedCount === 0 ? 'failed' : 'completed'
    session.completedAt = new Date()
    session.errors = errors.length > 0 ? errors : undefined
    this.activeSessions.set(sessionId, session)

    // Final progress report
    if (onProgress) {
      onProgress({
        sessionId,
        status: session.status,
        current: importedCount,
        total: session.totalCount,
        errors
      })
    }
  }

  /**
   * Get import session
   */
  getSession(sessionId: string): ImportSession | undefined {
    return this.activeSessions.get(sessionId)
  }

  /**
   * Cancel import session
   */
  async cancelImport(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)

    if (!session) {
      throw new Error(`Import session ${sessionId} not found`)
    }

    session.status = 'cancelled'
    session.completedAt = new Date()
    this.activeSessions.set(sessionId, session)
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): ImportSession[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId)
  }

  /**
   * Clean up completed sessions older than specified duration
   */
  cleanupOldSessions(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now()

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.completedAt) {
        const age = now - session.completedAt.getTime()

        if (age > maxAge) {
          this.activeSessions.delete(sessionId)
        }
      }
    }
  }
}

/**
 * Create cloud import service instance
 */
export function createCloudImportService(config: CloudImportServiceConfig): CloudImportService {
  return new CloudImportService(config)
}
