/**
 * Preflight Engine
 * Feature: BS-402
 *
 * Validates print-ready PDFs for common print production issues
 * Checks fonts, margins, bleed, image quality, color space, etc.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { RenditionJobResult } from './queue'

// ============================================================================
// TYPES
// ============================================================================

export interface PreflightOptions {
  renditionId: string
  bookId: string
  workspaceId: string
  onProgress?: (progress: number) => void
}

export interface PreflightWarning {
  type: 'font' | 'image_dpi' | 'color_space' | 'margins' | 'bleed' | 'transparency' | 'file_size'
  message: string
  severity: 'low' | 'medium' | 'high'
  location?: string
  details?: any
}

export interface PreflightCheck {
  name: string
  passed: boolean
  warnings: PreflightWarning[]
  errors: PreflightWarning[]
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

// ============================================================================
// PREFLIGHT CHECKS
// ============================================================================

/**
 * Check image DPI quality
 */
async function checkImageQuality(params: {
  bookId: string
  workspaceId: string
}): Promise<PreflightCheck> {
  const supabase = getSupabaseClient()
  const warnings: PreflightWarning[] = []
  const errors: PreflightWarning[] = []

  // Fetch all assets used in the book
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('book_id', params.bookId)

  if (assets) {
    for (const asset of assets) {
      const metadata = asset.metadata as any
      const dpi = metadata?.dpi || 0

      if (dpi < 150) {
        errors.push({
          type: 'image_dpi',
          message: `Image "${asset.filename}" has very low DPI (${dpi}), print quality will be poor`,
          severity: 'high',
          location: `Asset ID: ${asset.id}`,
          details: { assetId: asset.id, dpi, filename: asset.filename },
        })
      } else if (dpi < 300) {
        warnings.push({
          type: 'image_dpi',
          message: `Image "${asset.filename}" has low DPI (${dpi}), recommended minimum is 300 DPI`,
          severity: 'medium',
          location: `Asset ID: ${asset.id}`,
          details: { assetId: asset.id, dpi, filename: asset.filename },
        })
      }
    }
  }

  return {
    name: 'Image Quality Check',
    passed: errors.length === 0,
    warnings,
    errors,
  }
}

/**
 * Check margins and safe zones
 */
async function checkMarginsAndBleed(params: {
  bookId: string
}): Promise<PreflightCheck> {
  const supabase = getSupabaseClient()
  const warnings: PreflightWarning[] = []
  const errors: PreflightWarning[] = []

  // Fetch book specs
  const { data: book } = await supabase
    .from('books')
    .select('specs')
    .eq('id', params.bookId)
    .single()

  if (book) {
    const specs = book.specs as any
    const trimSize = specs?.trim_size
    const margins = specs?.margins

    // Check minimum margins
    const minMargin = 0.5 // 0.5 inches minimum
    if (margins) {
      if (margins.top < minMargin) {
        warnings.push({
          type: 'margins',
          message: `Top margin (${margins.top}") is below recommended minimum (${minMargin}")`,
          severity: 'medium',
          details: { margin: 'top', value: margins.top, minimum: minMargin },
        })
      }
      if (margins.bottom < minMargin) {
        warnings.push({
          type: 'margins',
          message: `Bottom margin (${margins.bottom}") is below recommended minimum (${minMargin}")`,
          severity: 'medium',
          details: { margin: 'bottom', value: margins.bottom, minimum: minMargin },
        })
      }
      if (margins.inside < minMargin) {
        warnings.push({
          type: 'margins',
          message: `Inside margin (${margins.inside}") is below recommended minimum (${minMargin}")`,
          severity: 'medium',
          details: { margin: 'inside', value: margins.inside, minimum: minMargin },
        })
      }
      if (margins.outside < minMargin) {
        warnings.push({
          type: 'margins',
          message: `Outside margin (${margins.outside}") is below recommended minimum (${minMargin}")`,
          severity: 'medium',
          details: { margin: 'outside', value: margins.outside, minimum: minMargin },
        })
      }
    }

    // Check bleed
    const recommendedBleed = 0.125 // 0.125 inches (3mm)
    if (!specs?.bleed || specs.bleed < recommendedBleed) {
      warnings.push({
        type: 'bleed',
        message: `Bleed is not set or below recommended ${recommendedBleed}" (3mm)`,
        severity: 'low',
        details: { bleed: specs?.bleed, recommended: recommendedBleed },
      })
    }
  }

  return {
    name: 'Margins & Bleed Check',
    passed: errors.length === 0,
    warnings,
    errors,
  }
}

/**
 * Check color space
 */
async function checkColorSpace(params: {
  bookId: string
}): Promise<PreflightCheck> {
  const supabase = getSupabaseClient()
  const warnings: PreflightWarning[] = []
  const errors: PreflightWarning[] = []

  // Fetch book specs
  const { data: book } = await supabase
    .from('books')
    .select('specs')
    .eq('id', params.bookId)
    .single()

  if (book) {
    const specs = book.specs as any
    const colorSpace = specs?.color_space

    if (colorSpace === 'RGB') {
      warnings.push({
        type: 'color_space',
        message: 'Book is using RGB color space. CMYK is recommended for print',
        severity: 'low',
        details: { colorSpace: 'RGB', recommended: 'CMYK' },
      })
    }
  }

  return {
    name: 'Color Space Check',
    passed: true, // RGB is acceptable, just a warning
    warnings,
    errors,
  }
}

/**
 * Check file sizes
 */
async function checkFileSizes(params: {
  renditionId: string
}): Promise<PreflightCheck> {
  const supabase = getSupabaseClient()
  const warnings: PreflightWarning[] = []
  const errors: PreflightWarning[] = []

  // Fetch rendition
  const { data: rendition } = await supabase
    .from('renditions')
    .select('file_size_bytes')
    .eq('id', params.renditionId)
    .single()

  if (rendition?.file_size_bytes) {
    const sizeMB = rendition.file_size_bytes / 1_000_000

    // Warn if file is very large (>100MB)
    if (sizeMB > 100) {
      warnings.push({
        type: 'file_size',
        message: `PDF file size is large (${sizeMB.toFixed(1)}MB). May be slow to upload/download`,
        severity: 'low',
        details: { sizeBytes: rendition.file_size_bytes, sizeMB },
      })
    }

    // Error if file exceeds typical POD limits (>500MB)
    if (sizeMB > 500) {
      errors.push({
        type: 'file_size',
        message: `PDF file size (${sizeMB.toFixed(1)}MB) exceeds most POD provider limits (500MB)`,
        severity: 'high',
        details: { sizeBytes: rendition.file_size_bytes, sizeMB },
      })
    }
  }

  return {
    name: 'File Size Check',
    passed: errors.length === 0,
    warnings,
    errors,
  }
}

// ============================================================================
// MAIN PREFLIGHT FUNCTION
// ============================================================================

/**
 * Run comprehensive preflight checks on a rendition
 */
export async function runPreflightChecks(
  params: PreflightOptions
): Promise<RenditionJobResult> {
  const { renditionId, bookId, workspaceId, onProgress } = params

  onProgress?.(10)

  const allWarnings: PreflightWarning[] = []
  const allErrors: PreflightWarning[] = []
  const checks: PreflightCheck[] = []

  try {
    // Run all checks
    onProgress?.(20)
    const imageCheck = await checkImageQuality({ bookId, workspaceId })
    checks.push(imageCheck)
    allWarnings.push(...imageCheck.warnings)
    allErrors.push(...imageCheck.errors)

    onProgress?.(40)
    const marginCheck = await checkMarginsAndBleed({ bookId })
    checks.push(marginCheck)
    allWarnings.push(...marginCheck.warnings)
    allErrors.push(...marginCheck.errors)

    onProgress?.(60)
    const colorCheck = await checkColorSpace({ bookId })
    checks.push(colorCheck)
    allWarnings.push(...colorCheck.warnings)
    allErrors.push(...colorCheck.errors)

    onProgress?.(80)
    const sizeCheck = await checkFileSizes({ renditionId })
    checks.push(sizeCheck)
    allWarnings.push(...sizeCheck.warnings)
    allErrors.push(...sizeCheck.errors)

    onProgress?.(90)

    // Determine overall pass/fail
    const allChecksPassed = checks.every((check) => check.passed)

    return {
      success: allChecksPassed,
      warnings: allWarnings,
      error: allErrors.length > 0
        ? {
            message: `Preflight failed with ${allErrors.length} error(s)`,
            code: 'PREFLIGHT_FAILED',
            details: {
              checks,
              errors: allErrors,
              warnings: allWarnings,
            },
          }
        : undefined,
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        message: `Preflight check failed: ${error.message}`,
        code: 'PREFLIGHT_ERROR',
        details: error,
      },
    }
  }
}
