# Image Optimization Pipeline

Automatic compression, format conversion, and thumbnail generation for VelloPad.

## Features

- ✅ **Automatic Compression**: Reduce file size while maintaining quality
- ✅ **Format Conversion**: Convert to optimal format (WebP, JPEG, PNG)
- ✅ **Thumbnail Generation**: Create multiple thumbnail sizes
- ✅ **DPI Validation**: Check if images meet print quality requirements
- ✅ **Batch Processing**: Optimize multiple images efficiently
- ✅ **Print Quality Checks**: Validate images for print production

## Usage

### Browser (Client-Side)

For image uploads in the browser:

```typescript
import { optimizeImageBrowser, OPTIMIZATION_PRESETS } from '@/lib/image-processing/optimizer'

// Single image optimization
const file = event.target.files[0]

const result = await optimizeImageBrowser(file, OPTIMIZATION_PRESETS.web)

console.log('Original size:', result.originalSize)
console.log('Optimized size:', result.optimizedSize)
console.log('Compression ratio:', result.compressionRatio)

// Upload optimized image
const formData = new FormData()
formData.append('image', result.blob, 'optimized.jpg')
```

### Batch Optimization

```typescript
import { batchOptimizeImages } from '@/lib/image-processing/optimizer'

const files = Array.from(fileInput.files)

const results = await batchOptimizeImages(
  files,
  OPTIMIZATION_PRESETS.print,
  (current, total) => {
    console.log(`Processing ${current}/${total}`)
  }
)
```

### Print Quality Validation

```typescript
import { validatePrintQuality, calculatePrintDPI } from '@/lib/image-processing/optimizer'

// Check if image meets print requirements
const validation = validatePrintQuality(
  imageWidth,
  imageHeight,
  6,  // 6 inches wide
  9,  // 9 inches tall
  300 // 300 DPI required
)

if (!validation.valid) {
  console.error('Print quality issues:', validation.warnings)
}

// Calculate actual DPI
const { dpiX, dpiY, quality } = calculatePrintDPI(
  imageWidth,
  imageHeight,
  6, // print width
  9  // print height
)
```

### Custom Configuration

```typescript
const customConfig = {
  quality: 90,
  maxWidth: 2400,
  maxHeight: 2400,
  targetFormat: 'jpeg' as const,
  generateThumbnails: true,
  thumbnailSizes: [150, 300, 600],
  stripMetadata: true,
  preserveOrientation: true
}

const result = await optimizeImageBrowser(file, customConfig)
```

## Optimization Presets

### Web (Default)
Best for web display and fast loading:
- Quality: 85%
- Max dimensions: 1920x1920
- Format: WebP
- Thumbnails: 150px, 300px, 600px
- Strips metadata

```typescript
OPTIMIZATION_PRESETS.web
```

### Print
High quality for print production:
- Quality: 95%
- Max dimensions: 5000x5000
- Format: JPEG
- Thumbnails: 300px
- Preserves metadata (EXIF, DPI)

```typescript
OPTIMIZATION_PRESETS.print
```

### Archive
Maximum quality preservation:
- Quality: 100%
- No size limits
- Format: PNG (lossless)
- No thumbnails
- Preserves all metadata

```typescript
OPTIMIZATION_PRESETS.archive
```

### Thumbnail
Generate small previews:
- Quality: 80%
- Max dimensions: 600x600
- Format: WebP
- Strips metadata

```typescript
OPTIMIZATION_PRESETS.thumbnail
```

## Print Quality Guidelines

### DPI Requirements

| Use Case | Minimum DPI | Recommended DPI |
|----------|-------------|-----------------|
| Web display | 72 | 72-96 |
| Draft print | 150 | 200 |
| Standard print | 250 | 300 |
| High-quality print | 300 | 350+ |

### Quality Ratings

- **Poor** (< 150 DPI): Not suitable for print
- **Acceptable** (150-250 DPI): Usable but not optimal
- **Good** (250-350 DPI): Recommended for most prints
- **Excellent** (> 350 DPI): Professional quality

### Recommended Image Sizes

| Print Size | 300 DPI | 350 DPI |
|------------|---------|---------|
| 4x6 inches | 1200x1800 | 1400x2100 |
| 5x7 inches | 1500x2100 | 1750x2450 |
| 6x9 inches | 1800x2700 | 2100x3150 |
| 8x10 inches | 2400x3000 | 2800x3500 |
| 8.5x11 inches | 2550x3300 | 2975x3850 |

```typescript
import { recommendImageSize } from '@/lib/image-processing/optimizer'

const { width, height } = recommendImageSize(
  6,   // 6 inches wide
  9,   // 9 inches tall
  300  // 300 DPI
)
// Returns: { width: 1800, height: 2700 }
```

## Server-Side Processing

For API routes (requires sharp or cloud service):

```typescript
import { validateImageForPrint, checkImageQualityServer } from '@/lib/image-processing/server-optimizer'

// Validate image for print
const validation = validateImageForPrint({
  width: 2400,
  height: 3000,
  format: 'jpeg',
  fileSize: 2500000,
  targetPrintSize: { width: 8, height: 10 }
})

if (!validation.valid) {
  return { error: validation.errors.join(', ') }
}

// Check quality
const quality = checkImageQualityServer({
  width: 2400,
  height: 3000,
  fileSize: 2500000,
  format: 'jpeg'
})
```

## API Route Example

```typescript
// app/api/photo-book/optimize/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { optimizeImageBrowser } from '@/lib/image-processing/optimizer'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('image') as File

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Optimize image
  const result = await optimizeImageBrowser(file, {
    tier: 'print',
    quality: 90,
    generateThumbnails: true
  })

  // Upload to storage
  // ... storage upload code ...

  return NextResponse.json({
    success: true,
    metadata: result.metadata,
    compressionRatio: result.compressionRatio
  })
}
```

## Component Example

```tsx
'use client'

import { useState } from 'react'
import { optimizeImageBrowser } from '@/lib/image-processing/optimizer'

export function ImageUploader() {
  const [progress, setProgress] = useState(0)

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])

    for (let i = 0; i < files.length; i++) {
      const result = await optimizeImageBrowser(files[i], {
        tier: 'print',
        quality: 90
      })

      // Upload result.blob to server
      // ...

      setProgress(((i + 1) / files.length) * 100)
    }
  }

  return (
    <div>
      <input type="file" multiple accept="image/*" onChange={handleUpload} />
      {progress > 0 && <progress value={progress} max={100} />}
    </div>
  )
}
```

## Performance Considerations

### Browser Optimization
- Canvas API is fast for most images
- Large images (> 10MB) may take 1-2 seconds
- Thumbnail generation adds ~100-200ms per thumbnail
- WebP encoding is slightly slower than JPEG

### Server Optimization
- Use sharp for production (requires native binaries)
- Or use cloud service (Cloudflare Images, imgix)
- Batch processing reduces overhead

### Memory Usage
- Browser: ~3x image size in memory during processing
- Large images (> 20MB) may cause memory issues on mobile
- Consider chunking for batch processing

## Future Enhancements

- [ ] AVIF format support (better than WebP)
- [ ] AI-powered smart cropping
- [ ] Face detection for optimal framing
- [ ] Color profile conversion (RGB to CMYK for print)
- [ ] Animated image support (GIF, WebP animation)
- [ ] Video thumbnail extraction

## Troubleshooting

### Image quality worse after optimization
- Increase quality setting (90-95)
- Use 'print' or 'archive' preset
- Check if format conversion is appropriate

### File size increased instead of decreased
- Original might already be optimized
- PNG to JPEG may increase size for certain images
- Try different format or quality settings

### Out of memory errors
- Reduce maxWidth/maxHeight
- Process images one at a time
- Use smaller thumbnail sizes
