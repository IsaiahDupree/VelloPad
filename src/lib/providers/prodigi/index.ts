/**
 * Prodigi Provider Module
 * Print-on-demand integration with Prodigi
 *
 * @module providers/prodigi
 * @see PB-013: Prodigi API Integration
 */

export { ProdigiClient, createProdigiClient } from './client'
export * from './types'

/**
 * Photo book SKUs for Prodigi
 * These are example SKUs - actual SKUs should be fetched from Prodigi API
 */
export const PRODIGI_PHOTO_BOOK_SKUS = {
  'hardcover-8x8': 'GLB-PHB-8X8-HC',
  'softcover-8x8': 'GLB-PHB-8X8-SC',
  'layflat-8x8': 'GLB-PHB-8X8-LF',
  'hardcover-10x10': 'GLB-PHB-10X10-HC',
  'softcover-10x10': 'GLB-PHB-10X10-SC',
  'layflat-10x10': 'GLB-PHB-10X10-LF',
  'hardcover-12x12': 'GLB-PHB-12X12-HC',
  'softcover-12x12': 'GLB-PHB-12X12-SC',
  'layflat-12x12': 'GLB-PHB-12X12-LF',
  'hardcover-8x11': 'GLB-PHB-8X11-HC',
  'softcover-8x11': 'GLB-PHB-8X11-SC'
} as const

/**
 * Get Prodigi SKU for book configuration
 */
export function getProdigiSKU(
  size: '8x8' | '10x10' | '12x12' | '8x11',
  binding: 'hardcover' | 'softcover' | 'layflat'
): string {
  const key = `${binding}-${size}` as keyof typeof PRODIGI_PHOTO_BOOK_SKUS
  return PRODIGI_PHOTO_BOOK_SKUS[key] || PRODIGI_PHOTO_BOOK_SKUS['softcover-8x8']
}

/**
 * Validate Prodigi order configuration
 */
export function validateProdigiOrder(
  size: string,
  binding: string,
  pageCount: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate size
  if (!['8x8', '10x10', '12x12', '8x11'].includes(size)) {
    errors.push(`Invalid size: ${size}`)
  }

  // Validate binding
  if (!['hardcover', 'softcover', 'layflat'].includes(binding)) {
    errors.push(`Invalid binding: ${binding}`)
  }

  // Validate page count
  if (pageCount < 20) {
    errors.push('Minimum 20 pages required')
  }
  if (pageCount > 200) {
    errors.push('Maximum 200 pages allowed')
  }
  if (binding === 'layflat' && pageCount > 120) {
    errors.push('Layflat binding supports maximum 120 pages')
  }

  // Check if SKU exists
  const key = `${binding}-${size}`
  if (!(key in PRODIGI_PHOTO_BOOK_SKUS)) {
    errors.push(`No SKU available for ${binding} ${size}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
