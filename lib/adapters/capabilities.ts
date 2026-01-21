/**
 * Product Mode Capabilities
 * Defines capabilities for different product modes (cover-only, custom interior, etc.)
 *
 * Feature: PM-008 - Product Mode Capabilities
 */

import type { ProductCapabilities, BindingType, PageSize, PaperType } from './notebook-adapter'

/**
 * Standard notebook capabilities (applies to most product modes)
 */
export const STANDARD_NOTEBOOK_CAPABILITIES = {
  // Cover customization
  supportsCoverDesign: true,
  supportsCustomCoverImage: true,
  supportsTextOnCover: true,

  // Quality requirements
  minimumDPI: 300,
  requiresBleed: true,
  requiresPrintReadyPDF: true,
} as const

/**
 * Cover-Only Mode Capabilities
 * User customizes cover, uses pre-approved stock interior PDF
 */
export const COVER_ONLY_CAPABILITIES: ProductCapabilities = {
  ...STANDARD_NOTEBOOK_CAPABILITIES,

  // Interior options
  supportsCoverOnly: true,
  supportsCustomInterior: false,
  supportsBlankInterior: false,

  // Binding options
  supportedBindings: ['perfect_bound', 'saddle_stitch', 'spiral', 'coil', 'wire-o'],
  supportsSpiral: true,
  supportsLayflat: false,

  // Page specifications
  allowedPageSizes: ['5x8', '5.5x8.5', '6x9', '8.5x11', 'A5', 'A4'],
  allowedPageCounts: [80, 100, 120, 150, 180, 200, 240], // Common notebook page counts
  allowedPaperTypes: ['standard-white', 'cream', 'premium-white'],

  // Provider integration
  compatibleProviders: ['prodigi', 'gelato', 'lulu', 'peecho'],
}

/**
 * Custom Interior Mode Capabilities
 * User edits pages (planner layouts, prompts, etc), generates print-ready interior PDF
 */
export const CUSTOM_INTERIOR_CAPABILITIES: ProductCapabilities = {
  ...STANDARD_NOTEBOOK_CAPABILITIES,

  // Interior options
  supportsCoverOnly: false,
  supportsCustomInterior: true,
  supportsBlankInterior: true, // Can also do blank pages

  // Binding options
  supportedBindings: ['perfect_bound', 'saddle_stitch', 'spiral', 'coil', 'wire-o', 'layflat'],
  supportsSpiral: true,
  supportsLayflat: true,

  // Page specifications
  allowedPageSizes: ['5x8', '5.5x8.5', '6x9', '7x10', '8x10', '8.5x11', 'A4', 'A5'],
  allowedPageCounts: { min: 24, max: 500 }, // More flexible for custom content
  allowedPaperTypes: ['standard-white', 'cream', 'premium-white', 'recycled', 'heavyweight'],

  // Provider integration
  compatibleProviders: ['prodigi', 'gelato', 'lulu', 'peecho'],
}

/**
 * Photo Book Mode Capabilities
 * Specialized for photo books with specific requirements
 */
export const PHOTO_BOOK_CAPABILITIES: ProductCapabilities = {
  ...STANDARD_NOTEBOOK_CAPABILITIES,

  // Cover customization
  supportsCoverDesign: true,
  supportsCustomCoverImage: true,
  supportsTextOnCover: true,

  // Interior options
  supportsCoverOnly: false,
  supportsCustomInterior: true,
  supportsBlankInterior: false, // Photo books always have content

  // Binding options
  supportedBindings: ['hardcover', 'perfect_bound', 'layflat'],
  supportsSpiral: false, // Photo books typically don't use spiral
  supportsLayflat: true,

  // Page specifications
  allowedPageSizes: ['8x10', '8.5x11'], // Common photo book sizes
  allowedPageCounts: { min: 20, max: 100 }, // Photo books are typically smaller
  allowedPaperTypes: ['premium-white', 'heavyweight'], // Higher quality for photos

  // Quality requirements
  minimumDPI: 300,
  requiresBleed: true,
  requiresPrintReadyPDF: true,

  // Provider integration
  compatibleProviders: ['prodigi', 'gelato'],
}

/**
 * Spiral Notebook Capabilities
 * Specific requirements for spiral-bound notebooks
 */
export const SPIRAL_NOTEBOOK_CAPABILITIES: ProductCapabilities = {
  ...STANDARD_NOTEBOOK_CAPABILITIES,

  // Interior options
  supportsCoverOnly: true,
  supportsCustomInterior: true,
  supportsBlankInterior: true,

  // Binding options
  supportedBindings: ['spiral', 'coil', 'wire-o'],
  supportsSpiral: true,
  supportsLayflat: false,

  // Page specifications
  allowedPageSizes: ['5.5x8.5', '6x9', '8.5x11', 'A4', 'A5'],
  allowedPageCounts: [80, 100, 120, 150, 200], // Standard spiral counts
  allowedPaperTypes: ['standard-white', 'cream', 'premium-white'],

  // Quality requirements
  minimumDPI: 300,
  requiresBleed: true, // Spiral binding requires bleed on binding edge
  requiresPrintReadyPDF: true,

  // Provider integration
  compatibleProviders: ['prodigi', 'peecho'],
}

/**
 * Hardcover Book Capabilities
 * Premium hardcover books
 */
export const HARDCOVER_BOOK_CAPABILITIES: ProductCapabilities = {
  ...STANDARD_NOTEBOOK_CAPABILITIES,

  // Interior options
  supportsCoverOnly: false,
  supportsCustomInterior: true,
  supportsBlankInterior: false,

  // Binding options
  supportedBindings: ['hardcover', 'layflat'],
  supportsSpiral: false,
  supportsLayflat: true,

  // Page specifications
  allowedPageSizes: ['5x8', '6x9', '7x10', '8x10', '8.5x11', 'A4', 'A5'],
  allowedPageCounts: { min: 24, max: 800 }, // Books can be longer
  allowedPaperTypes: ['standard-white', 'cream', 'premium-white', 'heavyweight'],

  // Quality requirements
  minimumDPI: 300,
  requiresBleed: true,
  requiresPrintReadyPDF: true,

  // Provider integration
  compatibleProviders: ['prodigi', 'gelato', 'lulu'],
}

/**
 * Get capabilities for a product mode
 */
export function getCapabilitiesForMode(
  mode: 'cover-only' | 'custom-interior' | 'photo-book' | 'spiral' | 'hardcover'
): ProductCapabilities {
  switch (mode) {
    case 'cover-only':
      return COVER_ONLY_CAPABILITIES
    case 'custom-interior':
      return CUSTOM_INTERIOR_CAPABILITIES
    case 'photo-book':
      return PHOTO_BOOK_CAPABILITIES
    case 'spiral':
      return SPIRAL_NOTEBOOK_CAPABILITIES
    case 'hardcover':
      return HARDCOVER_BOOK_CAPABILITIES
    default:
      throw new Error(`Unknown product mode: ${mode}`)
  }
}

/**
 * Check if a binding type is supported for a product mode
 */
export function isBindingSupported(
  mode: 'cover-only' | 'custom-interior' | 'photo-book' | 'spiral' | 'hardcover',
  binding: BindingType
): boolean {
  const capabilities = getCapabilitiesForMode(mode)
  return capabilities.supportedBindings.includes(binding)
}

/**
 * Check if a page size is supported for a product mode
 */
export function isPageSizeSupported(
  mode: 'cover-only' | 'custom-interior' | 'photo-book' | 'spiral' | 'hardcover',
  pageSize: PageSize
): boolean {
  const capabilities = getCapabilitiesForMode(mode)
  return capabilities.allowedPageSizes.includes(pageSize)
}

/**
 * Check if a page count is valid for a product mode
 */
export function isPageCountValid(
  mode: 'cover-only' | 'custom-interior' | 'photo-book' | 'spiral' | 'hardcover',
  pageCount: number
): boolean {
  const capabilities = getCapabilitiesForMode(mode)

  if (Array.isArray(capabilities.allowedPageCounts)) {
    return capabilities.allowedPageCounts.includes(pageCount)
  } else {
    const { min, max } = capabilities.allowedPageCounts
    return pageCount >= min && pageCount <= max
  }
}

/**
 * Check if a paper type is supported for a product mode
 */
export function isPaperTypeSupported(
  mode: 'cover-only' | 'custom-interior' | 'photo-book' | 'spiral' | 'hardcover',
  paperType: PaperType
): boolean {
  const capabilities = getCapabilitiesForMode(mode)
  return capabilities.allowedPaperTypes.includes(paperType)
}

/**
 * Get allowed page counts for a product mode
 */
export function getAllowedPageCounts(
  mode: 'cover-only' | 'custom-interior' | 'photo-book' | 'spiral' | 'hardcover'
): number[] {
  const capabilities = getCapabilitiesForMode(mode)

  if (Array.isArray(capabilities.allowedPageCounts)) {
    return capabilities.allowedPageCounts
  } else {
    // Generate array of valid page counts
    const { min, max } = capabilities.allowedPageCounts
    const counts: number[] = []

    // Generate common page counts (multiples of 4 for signatures)
    for (let count = min; count <= max; count += 4) {
      counts.push(count)
    }

    return counts
  }
}

/**
 * Get minimum DPI requirement for a product mode
 */
export function getMinimumDPI(
  mode: 'cover-only' | 'custom-interior' | 'photo-book' | 'spiral' | 'hardcover'
): number {
  const capabilities = getCapabilitiesForMode(mode)
  return capabilities.minimumDPI
}

/**
 * Check if a provider is compatible with a product mode
 */
export function isProviderCompatible(
  mode: 'cover-only' | 'custom-interior' | 'photo-book' | 'spiral' | 'hardcover',
  provider: string
): boolean {
  const capabilities = getCapabilitiesForMode(mode)
  return capabilities.compatibleProviders.includes(provider)
}
