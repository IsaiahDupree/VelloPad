/**
 * Page Dimensions
 * Defines physical dimensions for different page sizes
 */

import { PageSize, PageDimensions } from './types'

/**
 * Standard page dimensions in inches
 * Includes bleed and safe zone specifications for print
 */
export const PAGE_DIMENSIONS: Record<PageSize, PageDimensions> = {
  '8x8': {
    width: 8,
    height: 8,
    bleed: 0.125, // 1/8 inch bleed all around
    safeZone: 0.25 // 1/4 inch safe zone from trim
  },
  '10x10': {
    width: 10,
    height: 10,
    bleed: 0.125,
    safeZone: 0.25
  },
  '12x12': {
    width: 12,
    height: 12,
    bleed: 0.125,
    safeZone: 0.25
  },
  '8x11': {
    width: 8,
    height: 11,
    bleed: 0.125,
    safeZone: 0.25
  },
  A4: {
    width: 8.27,
    height: 11.69,
    bleed: 0.118, // 3mm
    safeZone: 0.236 // 6mm
  },
  letter: {
    width: 8.5,
    height: 11,
    bleed: 0.125,
    safeZone: 0.25
  }
}

/**
 * Get dimensions for a page size
 */
export function getDimensions(pageSize: PageSize): PageDimensions {
  return PAGE_DIMENSIONS[pageSize]
}

/**
 * Get printable area dimensions (excluding bleed and safe zone)
 */
export function getPrintableArea(pageSize: PageSize): {
  width: number
  height: number
} {
  const dims = getDimensions(pageSize)
  const margin = dims.bleed + dims.safeZone
  return {
    width: dims.width - margin * 2,
    height: dims.height - margin * 2
  }
}

/**
 * Get content area dimensions (excluding just bleed)
 */
export function getContentArea(pageSize: PageSize): {
  width: number
  height: number
} {
  const dims = getDimensions(pageSize)
  return {
    width: dims.width - dims.bleed * 2,
    height: dims.height - dims.bleed * 2
  }
}

/**
 * Convert inches to pixels at a given DPI
 */
export function inchesToPixels(inches: number, dpi: number = 300): number {
  return Math.round(inches * dpi)
}

/**
 * Convert pixels to inches at a given DPI
 */
export function pixelsToInches(pixels: number, dpi: number = 300): number {
  return pixels / dpi
}

/**
 * Get page dimensions in pixels for rendering
 */
export function getDimensionsInPixels(
  pageSize: PageSize,
  dpi: number = 300
): {
  width: number
  height: number
  bleed: number
  safeZone: number
} {
  const dims = getDimensions(pageSize)
  return {
    width: inchesToPixels(dims.width, dpi),
    height: inchesToPixels(dims.height, dpi),
    bleed: inchesToPixels(dims.bleed, dpi),
    safeZone: inchesToPixels(dims.safeZone, dpi)
  }
}

/**
 * Calculate aspect ratio
 */
export function getAspectRatio(pageSize: PageSize): number {
  const dims = getDimensions(pageSize)
  return dims.width / dims.height
}

/**
 * Check if page size is square
 */
export function isSquare(pageSize: PageSize): boolean {
  const dims = getDimensions(pageSize)
  return dims.width === dims.height
}

/**
 * Get orientation of page size
 */
export function getPageOrientation(pageSize: PageSize): 'square' | 'landscape' | 'portrait' {
  const dims = getDimensions(pageSize)
  if (dims.width === dims.height) return 'square'
  return dims.width > dims.height ? 'landscape' : 'portrait'
}
