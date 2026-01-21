# VelloPad Storage System

Flexible storage abstraction layer supporting multiple backends: Supabase Storage, AWS S3, and Cloudflare R2.

## Features

- 🔄 **Provider Agnostic**: Switch between storage providers with a single environment variable
- 🔐 **Signed URLs**: Generate temporary signed URLs for secure private file access
- 📦 **Batch Operations**: Delete multiple files efficiently
- 🗂️ **File Listing**: List files with prefix filtering
- 🌐 **Public URLs**: Get public URLs for uploaded files

## Configuration

Set the `STORAGE_PROVIDER` environment variable to choose your storage backend:

```bash
# Choose one: 'supabase' | 's3' | 'r2'
STORAGE_PROVIDER=supabase
```

### Supabase Storage (Default)

Uses existing Supabase credentials. No additional configuration needed.

```bash
STORAGE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### AWS S3

```bash
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=vellopad-assets
AWS_S3_PUBLIC_URL=https://cdn.example.com  # Optional, for custom CDN
```

### Cloudflare R2

R2 is S3-compatible but more cost-effective for egress:

```bash
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=vellopad-assets
R2_PUBLIC_URL=https://pub-abc123.r2.dev  # Optional, for custom domain
```

## Usage

### Basic Upload

```typescript
import { getStorageProvider } from '@/lib/storage'

const storage = getStorageProvider()

// Upload a file
const result = await storage.upload({
  path: 'workspace-123/image.jpg',
  file: fileBuffer,
  contentType: 'image/jpeg',
  metadata: {
    userId: 'user-456',
    bookId: 'book-789'
  }
})

console.log(result.url) // Public URL
```

### Generate Signed URL

```typescript
// Generate a temporary URL (default 1 hour)
const signedUrl = await storage.getSignedUrl(
  'workspace-123/private-document.pdf',
  3600 // expires in 1 hour
)
```

### Get Public URL

```typescript
// Get permanent public URL
const publicUrl = storage.getPublicUrl('workspace-123/image.jpg')
```

### Delete Files

```typescript
// Delete single file
await storage.delete('workspace-123/old-file.jpg')

// Delete multiple files
await storage.deleteMultiple([
  'workspace-123/file1.jpg',
  'workspace-123/file2.jpg'
])
```

### List Files

```typescript
// List all files with prefix
const files = await storage.list('workspace-123/')

files.forEach(file => {
  console.log(file.path, file.size, file.lastModified)
})
```

## Provider Interface

All storage providers implement the `StorageProvider` interface:

```typescript
interface StorageProvider {
  name: string
  upload(params: UploadParams): Promise<UploadResult>
  getSignedUrl(path: string, expiresIn?: number): Promise<string>
  getPublicUrl(path: string): string
  delete(path: string): Promise<void>
  deleteMultiple(paths: string[]): Promise<void>
  list(prefix: string): Promise<StorageFile[]>
}
```

## Adding New Providers

To add a new storage provider:

1. Create a new file in `lib/storage/providers/`
2. Implement the `StorageProvider` interface
3. Add the provider to `lib/storage/index.ts`

```typescript
// lib/storage/providers/my-provider.ts
import type { StorageProvider, UploadParams, UploadResult } from '../index'

export class MyStorageProvider implements StorageProvider {
  name = 'my-provider'

  async upload(params: UploadParams): Promise<UploadResult> {
    // Implementation
  }

  // ... implement other methods
}
```

## Best Practices

1. **Path Organization**: Use consistent path structure
   ```
   {workspaceId}/{userId}/{timestamp}-{random}.{ext}
   ```

2. **Content Types**: Always set correct content type for proper browser handling

3. **Error Handling**: Wrap storage operations in try-catch blocks

4. **Signed URLs**: Use signed URLs for private files, public URLs for shared assets

5. **Cleanup**: Delete files from storage when deleting database records

## Performance Tips

- **Batch Deletes**: Use `deleteMultiple()` instead of multiple `delete()` calls
- **CDN**: Configure custom domain/CDN for faster delivery (AWS_S3_PUBLIC_URL or R2_PUBLIC_URL)
- **Caching**: Set appropriate cache-control headers during upload
- **Compression**: Compress images before upload to save bandwidth

## Cost Optimization

### Supabase Storage
- Free tier: 1GB storage
- Paid: $0.021/GB/month
- Egress: $0.09/GB

### AWS S3
- Storage: $0.023/GB/month
- Egress: $0.09/GB (first 10TB)
- Good for: General purpose

### Cloudflare R2
- Storage: $0.015/GB/month
- Egress: **FREE** (major advantage!)
- Good for: High-traffic public files

**Recommendation**: Use R2 for production due to free egress.

## Troubleshooting

### "Storage provider not configured"
- Check that all required environment variables are set
- Verify credentials are correct

### "Failed to upload file"
- Check bucket permissions
- Verify bucket exists
- Check file size limits

### "Signed URL not working"
- Ensure bucket is not public (for signed URLs)
- Check expiration time
- Verify credentials have correct permissions

## Migration Between Providers

To migrate between storage providers:

1. Export files from old provider using `list()` and download
2. Update environment variables
3. Re-upload files using new provider
4. Update database records with new URLs

Alternatively, keep both providers configured and gradually migrate files on-demand.
