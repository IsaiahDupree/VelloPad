/**
 * Page Sizes Configuration
 * Support for multiple photo book formats
 *
 * @module pdf-generator/sizes
 * @see PB-011: Multiple Page Sizes
 */

import { PageSize } from './types'

/**
 * All supported page sizes for photo books
 */
export const PHOTO_BOOK_SIZES: Record<string, PageSize> = {
  '8x8': {
    width: 8,
    height: 8,
    name: '8x8 Square'
  },
  '10x10': {
    width: 10,
    height: 10,
    name: '10x10 Square'
  },
  '12x12': {
    width: 12,
    height: 12,
    name: '12x12 Square'
  },
  '8x11': {
    width: 8,
    height: 11,
    name: '8x11 Portrait'
  }
}

/**
 * Get all available page sizes
 */
export function getAvailablePageSizes(): PageSize[] {
  return Object.values(PHOTO_BOOK_SIZES)
}

/**
 * Get page size by key
 */
export function getPageSize(sizeKey: string): PageSize | undefined {
  return PHOTO_BOOK_SIZES[sizeKey]
}

/**
 * Validate if a size key is supported
 */
export function isSupportedSize(sizeKey: string): boolean {
  return sizeKey in PHOTO_BOOK_SIZES
}

/**
 * Get default page size
 */
export function getDefaultPageSize(): PageSize {
  return PHOTO_BOOK_SIZES['8x8']
}

/**
 * Format page size for display
 */
export function formatPageSize(size: PageSize): string {
  return `${size.width}" × ${size.height}" (${size.name})`
}
