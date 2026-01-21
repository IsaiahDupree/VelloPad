/**
 * Server-Side Image Optimization
 * For use in API routes and server components
 *
 * Note: This uses Canvas API which is available in Node.js via node-canvas
 * For production, consider using sharp (requires native binaries) or cloudflare images
 */

import type { ImageOptimizationConfig, ImageMetadata, OptimizedImage } from './optimizer'
import { OPTIMIZATION_PRESETS } from './optimizer'

/**
 * Optimize image on server (for API routes)
 *
 * Note: This is a simplified implementation using Canvas API.
 * For production, use sharp or a cloud service like Cloudflare Images.
 */
export async function optimizeImageServer(
  buffer: Buffer,
  config: ImageOptimizationConfig = {}
): Promise<OptimizedImage> {
  // Merge with preset
  const finalConfig = {
    ...OPTIMIZATION_PRESETS[config.tier || 'web'],
    ...config
  }

  const originalSize = buffer.length

  // For now, return the original as we need sharp for server-side processing
  // In production, this would use sharp:
  // const result = await sharp(buffer)
  //   .resize(finalConfig.maxWidth, finalConfig.maxHeight, { fit: 'inside' })
  //   .jpeg({ quality: finalConfig.quality })
  //   .toBuffer()

  // Mock implementation (in production, use sharp)
  const metadata: ImageMetadata = {
    width: 1000,  // Would be extracted from image
    height: 1000,
    format: 'jpeg',
    size: originalSize
  }

  return {
    blob: new Blob([buffer]),
    metadata,
    originalSize,
    optimizedSize: originalSize,
    compressionRatio: 1
  }
}

/**
 * Extract EXIF data from image buffer
 */
export async function extractExifData(buffer: Buffer): Promise<Record<string, any>> {
  // In production, use exif-parser or sharp to extract EXIF data
  // For now, return empty object
  return {}
}

/**
 * Server-side image quality check
 */
export function checkImageQualityServer(params: {
  width: number
  height: number
  fileSize: number
  format: string
}): {
  dpi: number
  quality: 'poor' | 'acceptable' | 'good' | 'excellent'
  warnings: string[]
} {
  const { width, height, fileSize, format } = params

  // Estimate DPI based on file size and dimensions
  const pixelCount = width * height
  const bytesPerPixel = fileSize / pixelCount

  // Very rough DPI estimation (this is not accurate without EXIF data)
  let estimatedDPI = 72 // Default screen DPI

  if (bytesPerPixel > 3 && format === 'png') {
    estimatedDPI = 300 // High quality PNG
  } else if (bytesPerPixel > 1.5 && format === 'jpeg') {
    estimatedDPI = 300 // High quality JPEG
  } else if (bytesPerPixel > 0.8) {
    estimatedDPI = 150 // Medium quality
  }

  // Determine quality
  let quality: 'poor' | 'acceptable' | 'good' | 'excellent'
  if (estimatedDPI < 150) {
    quality = 'poor'
  } else if (estimatedDPI < 250) {
    quality = 'acceptable'
  } else if (estimatedDPI < 350) {
    quality = 'good'
  } else {
    quality = 'excellent'
  }

  const warnings: string[] = []

  if (quality === 'poor') {
    warnings.push('Image quality may be too low for print')
  }

  if (width < 1200 || height < 1200) {
    warnings.push('Image dimensions may be too small for high-quality print')
  }

  return { dpi: estimatedDPI, quality, warnings }
}

/**
 * Validate image for print requirements
 */
export function validateImageForPrint(params: {
  width: number
  height: number
  format: string
  fileSize: number
  targetPrintSize: { width: number; height: number } // in inches
}): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  const { width, height, format, targetPrintSize } = params

  // Calculate required dimensions at 300 DPI
  const requiredWidth = targetPrintSize.width * 300
  const requiredHeight = targetPrintSize.height * 300

  // Check dimensions
  if (width < requiredWidth * 0.5 || height < requiredHeight * 0.5) {
    errors.push(
      `Image is too small (${width}x${height}). Need at least ${Math.round(requiredWidth)}x${Math.round(requiredHeight)} for 300 DPI`
    )
  } else if (width < requiredWidth || height < requiredHeight) {
    warnings.push(
      `Image dimensions (${width}x${height}) are below optimal for 300 DPI print (${Math.round(requiredWidth)}x${Math.round(requiredHeight)})`
    )
  }

  // Check format
  if (!['jpeg', 'jpg', 'png', 'tiff', 'tif'].includes(format.toLowerCase())) {
    warnings.push(`Format ${format} may not be optimal for print. Use JPEG, PNG, or TIFF.`)
  }

  // Check aspect ratio mismatch
  const imageAspect = width / height
  const printAspect = targetPrintSize.width / targetPrintSize.height
  const aspectDiff = Math.abs(imageAspect - printAspect)

  if (aspectDiff > 0.1) {
    warnings.push('Image aspect ratio does not match target print size. Image will be cropped or letterboxed.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Generate placeholder for image (low-quality preview)
 */
export async function generatePlaceholder(
  buffer: Buffer,
  targetWidth: number = 20
): Promise<string> {
  // In production, use sharp to generate tiny blur placeholder
  // For now, return empty data URL
  return 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
}

/**
 * Calculate optimal JPEG quality based on image characteristics
 */
export function calculateOptimalQuality(params: {
  width: number
  height: number
  hasTransparency: boolean
  contentType: 'photo' | 'graphic' | 'text'
}): { format: 'jpeg' | 'png' | 'webp'; quality: number } {
  const { width, height, hasTransparency, contentType } = params

  // If image has transparency, must use PNG or WebP
  if (hasTransparency) {
    return {
      format: 'png',
      quality: 90
    }
  }

  // For text/graphics, use PNG for sharp edges
  if (contentType === 'text' || contentType === 'graphic') {
    return {
      format: 'png',
      quality: 85
    }
  }

  // For photos, JPEG is usually best
  const pixelCount = width * height

  // Smaller images can use higher quality
  if (pixelCount < 500000) {
    // < 0.5MP
    return { format: 'jpeg', quality: 90 }
  } else if (pixelCount < 2000000) {
    // < 2MP
    return { format: 'jpeg', quality: 85 }
  } else {
    // >= 2MP
    return { format: 'jpeg', quality: 80 }
  }
}
