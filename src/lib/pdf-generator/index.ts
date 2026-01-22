/**
 * PDF Generator Module
 * Print-ready PDF generation with bleed, safe zones, and 300 DPI support
 *
 * @module pdf-generator
 * @see PB-010: Print-Ready PDF Generation
 *
 * Features:
 * - Print-ready PDFs with 3mm bleed and 6mm safe zone
 * - 300 DPI image resolution handling
 * - CMYK color space conversion (simplified)
 * - Cover PDF generation with spine calculation
 * - Trim marks and crop marks support
 *
 * Usage:
 * ```typescript
 * import { generatePDF, createPrintSpec, STANDARD_PAGE_SIZES } from '@/lib/pdf-generator'
 *
 * // Create spec
 * const spec = createPrintSpec(STANDARD_PAGE_SIZES['8x8'])
 *
 * // Generate PDF
 * const result = await generatePDF(pages, spec, 'output.pdf')
 * ```
 */

// Core generator
export { generatePDF, createPrintSpec } from './generator'

// Cover generator
export { generateCoverPDF } from './cover-generator'
export type { CoverDesign } from './cover-generator'

// Layout converter
export {
  convertLayoutsToPDFPages,
  validatePhotos
} from './layout-converter'
export type { PhotoMetadata } from './layout-converter'

// Utilities
export {
  inchesToPoints,
  pointsToInches,
  inchesToPixels,
  pixelsToInches,
  calculateDPI,
  calculatePrintAreas,
  calculateSpineWidth,
  normalizedToAbsolute,
  absoluteToNormalized,
  hexToRGB,
  rgbToCMYK,
  hexToCMYK,
  isWithinPrintArea,
  isInBleedArea
} from './utils'

// Types
export type {
  PDFSpec,
  PageSize,
  BindingType,
  CoverSpec,
  PDFImage,
  PDFElement,
  PDFImageElement,
  PDFTextElement,
  PDFPage,
  PDFGenerationResult,
  DPICalculation,
  PDFCoordinates,
  PrintArea
} from './types'

export {
  STANDARD_PAGE_SIZES,
  PRINT_SPECS
} from './types'

// Page sizes (PB-011)
export {
  PHOTO_BOOK_SIZES,
  getAvailablePageSizes,
  getPageSize,
  isSupportedSize,
  getDefaultPageSize,
  formatPageSize
} from './sizes'
