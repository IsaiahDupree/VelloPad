/**
 * Image Optimization Pipeline
 * Feature: PB-004 - Image Optimization Pipeline
 *
 * Automatic compression, format conversion, and thumbnail generation
 */

/**
 * Image optimization configuration
 */
export interface ImageOptimizationConfig {
  // Compression settings
  quality?: number  // 0-100, default 85
  maxWidth?: number // Maximum width in pixels
  maxHeight?: number // Maximum height in pixels

  // Format settings
  targetFormat?: 'jpeg' | 'png' | 'webp' | 'auto'
  preserveFormat?: boolean  // Keep original format

  // Thumbnail settings
  generateThumbnails?: boolean
  thumbnailSizes?: number[]  // e.g., [150, 300, 600]

  // Quality tiers
  tier?: 'web' | 'print' | 'archive'

  // Advanced
  stripMetadata?: boolean // Remove EXIF data (except orientation)
  preserveOrientation?: boolean
}

/**
 * Image metadata extracted from file
 */
export interface ImageMetadata {
  width: number
  height: number
  format: string
  size: number
  orientation?: number
  colorSpace?: string
  hasAlpha?: boolean
  dpi?: number
  exif?: Record<string, any>
}

/**
 * Optimized image result
 */
export interface OptimizedImage {
  // Optimized image data
  blob: Blob
  url?: string  // If uploaded to storage

  // Metadata
  metadata: ImageMetadata

  // Thumbnails (if generated)
  thumbnails?: Array<{
    size: number
    blob: Blob
    url?: string
  }>

  // Optimization stats
  originalSize: number
  optimizedSize: number
  compressionRatio: number
}

/**
 * Default optimization configurations for different use cases
 */
export const OPTIMIZATION_PRESETS: Record<string, ImageOptimizationConfig> = {
  // Web display (fast loading, good quality)
  web: {
    quality: 85,
    maxWidth: 1920,
    maxHeight: 1920,
    targetFormat: 'webp',
    generateThumbnails: true,
    thumbnailSizes: [150, 300, 600],
    stripMetadata: true,
    preserveOrientation: true,
    tier: 'web'
  },

  // Print quality (high resolution, minimal compression)
  print: {
    quality: 95,
    maxWidth: 5000,
    maxHeight: 5000,
    targetFormat: 'jpeg',
    generateThumbnails: true,
    thumbnailSizes: [300],
    stripMetadata: false,
    preserveOrientation: true,
    tier: 'print'
  },

  // Archive (maximum quality, lossless if possible)
  archive: {
    quality: 100,
    targetFormat: 'png',
    generateThumbnails: false,
    stripMetadata: false,
    preserveOrientation: true,
    tier: 'archive'
  },

  // Thumbnail generation only
  thumbnail: {
    quality: 80,
    maxWidth: 600,
    maxHeight: 600,
    targetFormat: 'webp',
    generateThumbnails: false,
    stripMetadata: true,
    preserveOrientation: true,
    tier: 'web'
  }
}

/**
 * Extract metadata from image file
 */
export async function extractImageMetadata(file: File | Blob): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const metadata: ImageMetadata = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: file.type.split('/')[1] || 'unknown',
        size: file.size
      }

      URL.revokeObjectURL(url)
      resolve(metadata)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Optimize image using Canvas API (browser)
 */
export async function optimizeImageBrowser(
  file: File | Blob,
  config: ImageOptimizationConfig = {}
): Promise<OptimizedImage> {
  const finalConfig = {
    ...OPTIMIZATION_PRESETS[config.tier || 'web'],
    ...config
  }

  // Extract original metadata
  const originalMetadata = await extractImageMetadata(file)
  const originalSize = file.size

  // Load image
  const img = await loadImage(file)

  // Calculate target dimensions
  const { width, height } = calculateTargetDimensions(
    img.width,
    img.height,
    finalConfig.maxWidth,
    finalConfig.maxHeight
  )

  // Create canvas and draw resized image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Use high-quality scaling
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  // Convert to blob
  const quality = (finalConfig.quality || 85) / 100
  const mimeType = getMimeType(finalConfig.targetFormat || 'auto', file.type)

  const blob = await canvasToBlob(canvas, mimeType, quality)

  // Generate thumbnails if requested
  let thumbnails: OptimizedImage['thumbnails']
  if (finalConfig.generateThumbnails && finalConfig.thumbnailSizes) {
    thumbnails = await generateThumbnails(img, finalConfig.thumbnailSizes, mimeType, quality)
  }

  // Calculate compression
  const optimizedSize = blob.size
  const compressionRatio = originalSize / optimizedSize

  return {
    blob,
    metadata: {
      ...originalMetadata,
      width,
      height,
      size: optimizedSize,
      format: mimeType.split('/')[1]
    },
    thumbnails,
    originalSize,
    optimizedSize,
    compressionRatio
  }
}

/**
 * Calculate target dimensions maintaining aspect ratio
 */
function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth?: number,
  maxHeight?: number
): { width: number; height: number } {
  let width = originalWidth
  let height = originalHeight

  if (maxWidth && width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }

  if (maxHeight && height > maxHeight) {
    width = (width * maxHeight) / height
    height = maxHeight
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  }
}

/**
 * Get MIME type for target format
 */
function getMimeType(format: string, originalType: string): string {
  if (format === 'auto') {
    // Use WebP if supported, otherwise JPEG
    const supportsWebP = document.createElement('canvas')
      .toDataURL('image/webp')
      .startsWith('data:image/webp')

    return supportsWebP ? 'image/webp' : 'image/jpeg'
  }

  const mimeTypes: Record<string, string> = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
  }

  return mimeTypes[format] || originalType
}

/**
 * Load image from file
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Convert canvas to blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      },
      mimeType,
      quality
    )
  })
}

/**
 * Generate thumbnails
 */
async function generateThumbnails(
  img: HTMLImageElement,
  sizes: number[],
  mimeType: string,
  quality: number
): Promise<Array<{ size: number; blob: Blob }>> {
  const thumbnails: Array<{ size: number; blob: Blob }> = []

  for (const size of sizes) {
    const canvas = document.createElement('canvas')
    const dimensions = calculateTargetDimensions(img.width, img.height, size, size)

    canvas.width = dimensions.width
    canvas.height = dimensions.height

    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height)

    const blob = await canvasToBlob(canvas, mimeType, quality)

    thumbnails.push({ size, blob })
  }

  return thumbnails
}

/**
 * Batch optimize multiple images
 */
export async function batchOptimizeImages(
  files: File[],
  config: ImageOptimizationConfig = {},
  onProgress?: (current: number, total: number) => void
): Promise<OptimizedImage[]> {
  const results: OptimizedImage[] = []

  for (let i = 0; i < files.length; i++) {
    const result = await optimizeImageBrowser(files[i], config)
    results.push(result)

    if (onProgress) {
      onProgress(i + 1, files.length)
    }
  }

  return results
}

/**
 * Calculate DPI estimate based on dimensions and target print size
 */
export function calculatePrintDPI(
  imageWidth: number,
  imageHeight: number,
  printWidth: number,  // in inches
  printHeight: number  // in inches
): { dpiX: number; dpiY: number; quality: 'poor' | 'acceptable' | 'good' | 'excellent' } {
  const dpiX = Math.round(imageWidth / printWidth)
  const dpiY = Math.round(imageHeight / printHeight)
  const minDPI = Math.min(dpiX, dpiY)

  let quality: 'poor' | 'acceptable' | 'good' | 'excellent'
  if (minDPI < 150) {
    quality = 'poor'
  } else if (minDPI < 250) {
    quality = 'acceptable'
  } else if (minDPI < 350) {
    quality = 'good'
  } else {
    quality = 'excellent'
  }

  return { dpiX, dpiY, quality }
}

/**
 * Validate image meets print quality requirements
 */
export function validatePrintQuality(
  width: number,
  height: number,
  targetPrintWidth: number,
  targetPrintHeight: number,
  minimumDPI: number = 300
): { valid: boolean; warnings: string[]; dpi: number } {
  const { dpiX, dpiY, quality } = calculatePrintDPI(width, height, targetPrintWidth, targetPrintHeight)
  const minDPI = Math.min(dpiX, dpiY)

  const warnings: string[] = []
  let valid = true

  if (minDPI < minimumDPI) {
    valid = false
    warnings.push(`Image DPI (${minDPI}) is below required minimum (${minimumDPI})`)
  }

  if (quality === 'poor') {
    warnings.push('Image quality is poor for print, expect visible pixelation')
  } else if (quality === 'acceptable') {
    warnings.push('Image quality is acceptable but not optimal for print')
  }

  return { valid, warnings, dpi: minDPI }
}

/**
 * Recommend optimal image size for target print dimensions
 */
export function recommendImageSize(
  printWidth: number,   // inches
  printHeight: number,  // inches
  targetDPI: number = 300
): { width: number; height: number } {
  return {
    width: Math.round(printWidth * targetDPI),
    height: Math.round(printHeight * targetDPI)
  }
}
