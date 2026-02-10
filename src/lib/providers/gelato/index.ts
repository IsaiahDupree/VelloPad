/**
 * Gelato Provider Module
 * Print-on-demand integration with Gelato
 *
 * @module providers/gelato
 * @see PB-032: Gelato Integration
 */

export { GelatoClient, createGelatoClient } from './client'
export { GelatoAdapter, createGelatoAdapter, GELATO_PRODUCT_UIDS } from './adapter'
export * from './types'

/**
 * Get Gelato product UID for book configuration
 */
export function getGelatoProductUid(
  size: '8x8' | '10x10' | '12x12' | '8.5x11',
  binding: 'hardcover' | 'softcover' | 'layflat'
): string {
  const key = `${binding}-${size}` as keyof typeof GELATO_PRODUCT_UIDS
  return GELATO_PRODUCT_UIDS[key] || GELATO_PRODUCT_UIDS['softcover-8x8']
}

/**
 * Validate Gelato order configuration
 */
export function validateGelatoOrder(
  size: string,
  binding: string,
  pageCount: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate size
  if (!['8x8', '10x10', '12x12', '8.5x11'].includes(size)) {
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
  if (pageCount % 2 !== 0) {
    errors.push('Page count must be even')
  }
  if (binding === 'layflat' && pageCount > 120) {
    errors.push('Layflat binding supports maximum 120 pages')
  }

  // Check if product UID exists
  const key = `${binding}-${size}`
  if (!(key in GELATO_PRODUCT_UIDS)) {
    errors.push(`No product available for ${binding} ${size}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

import { GELATO_PRODUCT_UIDS } from './adapter'
