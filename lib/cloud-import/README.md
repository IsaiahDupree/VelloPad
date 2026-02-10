# Cloud Storage Integration

Bulk upload from Google Photos, Dropbox, and iCloud for VelloPad photo book projects.

## Overview

The Cloud Import system provides a unified interface for importing photos from multiple cloud storage providers. It handles OAuth authentication, file listing, and batch downloads with progress tracking.

## Supported Providers

| Provider | Status | OAuth Support | Features |
|----------|--------|---------------|----------|
| Google Photos | ✅ Full | Yes | Albums, Metadata, EXIF |
| Dropbox | ✅ Full | Yes | Folders, Recursive |
| iCloud | ⏳ Planned | Limited | Future implementation |

## Quick Start

```typescript
import { createCloudImportService } from '@/lib/cloud-import'

// Initialize service
const cloudImport = createCloudImportService({
  googlePhotos: {
    clientId: process.env.GOOGLE_PHOTOS_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_PHOTOS_CLIENT_SECRET!
  },
  dropbox: {
    appKey: process.env.DROPBOX_APP_KEY!,
    appSecret: process.env.DROPBOX_APP_SECRET!
  }
})

// Get authorization URL
const authUrl = cloudImport.getAuthUrl(
  'google-photos',
  'https://yourapp.com/callback',
  'random-state-string'
)

// Exchange code for token
const auth = await cloudImport.authenticateProvider(
  'google-photos',
  'auth-code-from-callback',
  'https://yourapp.com/callback'
)

// List folders/albums
const folders = await cloudImport.listFolders(auth)

// List files
const files = await cloudImport.listFiles(auth, {
  folderId: 'album-id',
  fileFilter: {
    mimeTypes: ['image/'],
    dateRange: {
      from: new Date('2024-01-01'),
      to: new Date('2024-12-31')
    }
  }
})

// Create import session
const session = await cloudImport.createImportSession(
  'google-photos',
  'user-123',
  'project-456',
  files.map(f => f.id)
)

// Start import with progress tracking
await cloudImport.startImport(
  session.id,
  auth,
  (progress) => {
    console.log(`Imported ${progress.current}/${progress.total}`)
    console.log(`Current file: ${progress.currentFile}`)
  }
)
```

## Provider Setup

### Google Photos

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google Photos Library API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URIs
5. Copy Client ID and Client Secret to environment variables

```env
GOOGLE_PHOTOS_CLIENT_ID=your-client-id
GOOGLE_PHOTOS_CLIENT_SECRET=your-client-secret
```

### Dropbox

1. Create an app in [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Choose "Scoped access" and "Full Dropbox" access
3. Add OAuth redirect URIs
4. Copy App key and App secret to environment variables

```env
DROPBOX_APP_KEY=your-app-key
DROPBOX_APP_SECRET=your-app-secret
```

### iCloud

iCloud integration is planned for future implementation. Currently, iCloud doesn't provide a public OAuth API like other providers.

**Alternative approaches:**
- Manual upload (drag & drop)
- Import from Files app on iOS/macOS
- Third-party services

## Authentication Flow

```typescript
// 1. Get authorization URL
const authUrl = cloudImport.getAuthUrl(provider, redirectUri, state)

// 2. Redirect user to authUrl
// User authorizes access

// 3. Handle callback with authorization code
const auth = await cloudImport.authenticateProvider(provider, code, redirectUri)

// 4. Store auth in database for future use
await saveUserAuth(userId, auth)

// 5. Refresh token when expired
if (auth.expiresAt && new Date() >= auth.expiresAt) {
  auth = await cloudImport.refreshProviderAuth(auth)
}
```

## File Filtering

Filter files by MIME type, size, and date range:

```typescript
const files = await cloudImport.listFiles(auth, {
  fileFilter: {
    // Only images
    mimeTypes: ['image/jpeg', 'image/png', 'image/heic'],

    // Max 50MB
    maxSize: 50 * 1024 * 1024,

    // Photos from 2024
    dateRange: {
      from: new Date('2024-01-01'),
      to: new Date('2024-12-31')
    }
  }
})
```

## Import Session Management

```typescript
// Create session
const session = await cloudImport.createImportSession(
  provider,
  userId,
  projectId,
  selectedFileIds
)

// Start import with progress callback
await cloudImport.startImport(session.id, auth, (progress) => {
  // Update UI with progress
  console.log(`${progress.current}/${progress.total}`)

  // Handle errors
  if (progress.errors.length > 0) {
    console.error('Import errors:', progress.errors)
  }
})

// Get session status
const session = cloudImport.getSession(sessionId)
console.log('Status:', session.status)
console.log('Imported:', session.importedCount)
console.log('Total:', session.totalCount)

// Cancel import
await cloudImport.cancelImport(sessionId)

// Cleanup old sessions (runs periodically)
cloudImport.cleanupOldSessions(24 * 60 * 60 * 1000) // 24 hours
```

## Error Handling

```typescript
try {
  await cloudImport.startImport(sessionId, auth, (progress) => {
    // Handle per-file errors
    if (progress.errors.length > 0) {
      progress.errors.forEach(error => {
        console.error(`Failed to import ${error.fileName}: ${error.error}`)
      })
    }
  })
} catch (error) {
  // Handle fatal errors
  console.error('Import failed:', error)
}
```

## API Routes

### Authentication Callback

```typescript
// app/api/cloud-import/callback/route.ts
import { cloudImportService } from '@/lib/cloud-import'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const provider = searchParams.get('provider')

  if (!code || !state || !provider) {
    return new Response('Missing parameters', { status: 400 })
  }

  const auth = await cloudImportService.authenticateProvider(
    provider as CloudProvider,
    code,
    'https://yourapp.com/api/cloud-import/callback'
  )

  // Store auth in database
  await saveUserAuth(userId, auth)

  return Response.redirect('/photo-book/import')
}
```

### List Files

```typescript
// app/api/cloud-import/files/route.ts
export async function POST(request: Request) {
  const { provider, folderId, fileFilter } = await request.json()

  const auth = await getUserAuth(userId, provider)

  const files = await cloudImportService.listFiles(auth, {
    folderId,
    fileFilter
  })

  return Response.json(files)
}
```

### Start Import

```typescript
// app/api/cloud-import/import/route.ts
export async function POST(request: Request) {
  const { provider, fileIds, projectId } = await request.json()

  const session = await cloudImportService.createImportSession(
    provider,
    userId,
    projectId,
    fileIds
  )

  // Start import in background
  const auth = await getUserAuth(userId, provider)

  // Use server-sent events or websockets for real-time progress
  cloudImportService.startImport(session.id, auth, (progress) => {
    // Send progress update to client
    sendProgressUpdate(userId, progress)
  })

  return Response.json({ sessionId: session.id })
}
```

## Best Practices

### 1. Token Management

```typescript
// Always check token expiration
async function ensureValidAuth(auth: ProviderAuth): Promise<ProviderAuth> {
  if (auth.expiresAt && new Date() >= auth.expiresAt) {
    auth = await cloudImportService.refreshProviderAuth(auth)
    await updateUserAuth(auth)
  }
  return auth
}
```

### 2. Progress Tracking

```typescript
// Use real-time updates (SSE or WebSockets)
async function startImportWithProgress(sessionId: string) {
  const eventSource = new EventSource(`/api/import/progress/${sessionId}`)

  eventSource.onmessage = (event) => {
    const progress = JSON.parse(event.data)
    updateProgressBar(progress.current, progress.total)
  }
}
```

### 3. Error Recovery

```typescript
// Allow users to retry failed imports
if (session.errors && session.errors.length > 0) {
  const failedFileIds = session.errors.map(e => e.fileId)

  // Create new session with failed files only
  const retrySession = await cloudImportService.createImportSession(
    provider,
    userId,
    projectId,
    failedFileIds
  )

  await cloudImportService.startImport(retrySession.id, auth)
}
```

### 4. Rate Limiting

```typescript
// Respect provider rate limits
// Google Photos: 10 requests per second
// Dropbox: Varies by endpoint

// Implement exponential backoff for retries
async function downloadWithRetry(provider, fileId, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await provider.downloadFile(auth, fileId)
    } catch (error) {
      if (attempt < maxRetries - 1) {
        await delay(Math.pow(2, attempt) * 1000) // Exponential backoff
      } else {
        throw error
      }
    }
  }
}
```

## Testing

```typescript
import { describe, test, expect } from '@playwright/test'
import { createCloudImportService } from '@/lib/cloud-import'

describe('Cloud Import', () => {
  test('lists Google Photos albums', async () => {
    const service = createCloudImportService({
      googlePhotos: {
        clientId: process.env.TEST_GOOGLE_CLIENT_ID!,
        clientSecret: process.env.TEST_GOOGLE_CLIENT_SECRET!
      }
    })

    const mockAuth = createMockAuth('google-photos')
    const folders = await service.listFolders(mockAuth)

    expect(folders.length).toBeGreaterThan(0)
  })

  test('imports files successfully', async () => {
    const service = createCloudImportService(testConfig)

    const session = await service.createImportSession(
      'google-photos',
      'user-123',
      'project-456',
      ['file-1', 'file-2']
    )

    let progressUpdates = 0

    await service.startImport(session.id, mockAuth, (progress) => {
      progressUpdates++
      expect(progress.current).toBeLessThanOrEqual(progress.total)
    })

    expect(progressUpdates).toBeGreaterThan(0)
    expect(session.status).toBe('completed')
  })
})
```

## Troubleshooting

### "Provider not configured"

Ensure environment variables are set correctly and the provider is initialized in the service config.

### "Token expired"

Use `refreshProviderAuth()` to refresh the access token with the refresh token.

### "Rate limit exceeded"

Implement exponential backoff and respect provider rate limits.

### "Download failed"

Check file permissions, network connectivity, and provider API status.

## Related Features

- **PB-001**: Photo Drag-and-Drop Upload
- **PB-003**: Image Auto-Organization
- **PB-004**: Image Optimization Pipeline
- **PB-005**: R2/S3 Storage Integration

## Future Enhancements

- iCloud Photo Library support
- OneDrive integration
- Amazon Photos support
- Resume interrupted imports
- Selective sync
- Duplicate detection
