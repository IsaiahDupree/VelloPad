/**
 * PDF Generator Types
 * Type definitions for print-ready PDF generation
 *
 * @module pdf-generator/types
 * @see PB-010: Print-Ready PDF Generation
 */

/**
 * PDF generation specification
 * All dimensions in inches unless specified
 */
export interface PDFSpec {
  pageSize: PageSize
  bleedInches: number // Standard: 0.125" (3mm)
  safeZoneInches: number // Standard: 0.25" (6mm)
  dpi: number // Standard: 300 DPI for print
  colorSpace: 'RGB' | 'CMYK' // CMYK for professional printing
  includeBleed: boolean
  includeTrimMarks?: boolean
  includeCropMarks?: boolean
}

/**
 * Page size dimensions in inches
 */
export interface PageSize {
  width: number // inches
  height: number // inches
  name: string // e.g., "8x8", "10x10", "12x12"
}

/**
 * Standard page sizes for photo books
 */
export const STANDARD_PAGE_SIZES: Record<string, PageSize> = {
  '8x8': { width: 8, height: 8, name: '8x8' },
  '10x10': { width: 10, height: 10, name: '10x10' },
  '12x12': { width: 12, height: 12, name: '12x12' },
  '8x11': { width: 8, height: 11, name: '8x11' },
  'letter': { width: 8.5, height: 11, name: 'Letter' },
  'A4': { width: 8.27, height: 11.69, name: 'A4' }
}

/**
 * Print specification constants
 */
export const PRINT_SPECS = {
  STANDARD_BLEED: 0.125, // 3mm in inches
  STANDARD_SAFE_ZONE: 0.25, // 6mm in inches (from trim edge)
  PRINT_DPI: 300,
  MIN_DPI: 150, // Minimum acceptable DPI
  SCREEN_DPI: 72 // Screen resolution for comparison
} as const

/**
 * Binding type affects spine width calculation
 */
export type BindingType = 'hardcover' | 'softcover' | 'layflat'

/**
 * Cover specification for spine calculation
 */
export interface CoverSpec {
  pageCount: number
  paperWeight: number // pounds (e.g., 80lb, 100lb)
  binding: BindingType
  coverMaterial?: 'matte' | 'glossy' | 'linen'
  hasJacket?: boolean
}

/**
 * Image with metadata for PDF placement
 */
export interface PDFImage {
  id: string
  url: string // Local path or URL
  width: number // Original width in pixels
  height: number // Original height in pixels
  format: 'jpeg' | 'png' | 'tiff'
  dpi?: number // If available from EXIF
}

/**
 * Positioned element on PDF page
 */
export interface PDFElement {
  type: 'image' | 'text' | 'shape'
  x: number // inches from left (accounting for bleed)
  y: number // inches from top (accounting for bleed)
  width: number // inches
  height: number // inches
  rotation?: number // degrees
  zIndex?: number
}

/**
 * Image element
 */
export interface PDFImageElement extends PDFElement {
  type: 'image'
  image: PDFImage
  fit: 'cover' | 'contain' | 'fill'
}

/**
 * Text element
 */
export interface PDFTextElement extends PDFElement {
  type: 'text'
  content: string
  fontSize: number // points
  fontFamily: string
  fontWeight?: 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right'
  color: string // Hex color
}

/**
 * Complete page definition for PDF
 */
export interface PDFPage {
  pageNumber: number
  pageType: 'cover-front' | 'cover-spine' | 'cover-back' | 'content'
  elements: (PDFImageElement | PDFTextElement)[]
  backgroundColor?: string
}

/**
 * PDF generation result
 */
export interface PDFGenerationResult {
  success: boolean
  pdfPath?: string
  pdfBuffer?: Buffer
  pageCount: number
  fileSize: number // bytes
  warnings: string[]
  errors?: string[]
  metadata: {
    generatedAt: Date
    generationTime: number // ms
    spec: PDFSpec
  }
}

/**
 * DPI calculation result
 */
export interface DPICalculation {
  actualDPI: number
  targetDPI: number
  isPrintSafe: boolean // actualDPI >= MIN_DPI
  isPrintOptimal: boolean // actualDPI >= PRINT_DPI
  warningMessage?: string
}

/**
 * Coordinate system for PDF
 * Origin (0,0) is at top-left including bleed area
 */
export interface PDFCoordinates {
  x: number // inches
  y: number // inches
}

/**
 * Print area boundaries
 */
export interface PrintArea {
  bleedArea: {
    x: number
    y: number
    width: number
    height: number
  }
  trimArea: {
    x: number
    y: number
    width: number
    height: number
  }
  safeArea: {
    x: number
    y: number
    width: number
    height: number
  }
}
