/**
 * PDF Generator Utility Functions
 * Helper functions for DPI calculations, unit conversions, and print area calculations
 *
 * @module pdf-generator/utils
 */

import type {
  PDFSpec,
  PageSize,
  PDFImage,
  DPICalculation,
  PrintArea,
  PDFCoordinates
} from './types'
import { PRINT_SPECS } from './types'

/**
 * Convert inches to points (PDF standard unit)
 * 1 inch = 72 points
 */
export function inchesToPoints(inches: number): number {
  return inches * 72
}

/**
 * Convert points to inches
 */
export function pointsToInches(points: number): number {
  return points / 72
}

/**
 * Convert inches to pixels at given DPI
 */
export function inchesToPixels(inches: number, dpi: number): number {
  return Math.round(inches * dpi)
}

/**
 * Convert pixels to inches at given DPI
 */
export function pixelsToInches(pixels: number, dpi: number): number {
  return pixels / dpi
}

/**
 * Calculate actual DPI when an image is placed at a specific size
 *
 * @param imageWidthPx - Original image width in pixels
 * @param imageHeightPx - Original image height in pixels
 * @param printWidthInches - Desired print width in inches
 * @param printHeightInches - Desired print height in inches
 * @returns DPI calculation result
 */
export function calculateDPI(
  imageWidthPx: number,
  imageHeightPx: number,
  printWidthInches: number,
  printHeightInches: number
): DPICalculation {
  const dpiWidth = imageWidthPx / printWidthInches
  const dpiHeight = imageHeightPx / printHeightInches

  // Use the lower DPI (worst case)
  const actualDPI = Math.min(dpiWidth, dpiHeight)
  const targetDPI = PRINT_SPECS.PRINT_DPI

  const isPrintSafe = actualDPI >= PRINT_SPECS.MIN_DPI
  const isPrintOptimal = actualDPI >= PRINT_SPECS.PRINT_DPI

  let warningMessage: string | undefined

  if (!isPrintSafe) {
    warningMessage = `Image DPI (${Math.round(actualDPI)}) is below minimum ${PRINT_SPECS.MIN_DPI} DPI. Print quality will be poor.`
  } else if (!isPrintOptimal) {
    warningMessage = `Image DPI (${Math.round(actualDPI)}) is below optimal ${PRINT_SPECS.PRINT_DPI} DPI. Consider using a higher resolution image for best print quality.`
  }

  return {
    actualDPI: Math.round(actualDPI),
    targetDPI,
    isPrintSafe,
    isPrintOptimal,
    warningMessage
  }
}

/**
 * Calculate print areas (bleed, trim, safe) for a page
 *
 * @param pageSize - Page dimensions in inches
 * @param spec - PDF specification with bleed and safe zone
 * @returns Print area boundaries
 */
export function calculatePrintAreas(
  pageSize: PageSize,
  spec: PDFSpec
): PrintArea {
  const bleed = spec.includeBleed ? spec.bleedInches : 0
  const safeZone = spec.safeZoneInches

  // Bleed area (total area including bleed)
  const bleedArea = {
    x: 0,
    y: 0,
    width: pageSize.width + (bleed * 2),
    height: pageSize.height + (bleed * 2)
  }

  // Trim area (final printed size)
  const trimArea = {
    x: bleed,
    y: bleed,
    width: pageSize.width,
    height: pageSize.height
  }

  // Safe area (content should stay within this)
  const safeArea = {
    x: bleed + safeZone,
    y: bleed + safeZone,
    width: pageSize.width - (safeZone * 2),
    height: pageSize.height - (safeZone * 2)
  }

  return {
    bleedArea,
    trimArea,
    safeArea
  }
}

/**
 * Calculate spine width based on page count and paper weight
 * Formula: spine width = (pages / 2) × (paper thickness)
 *
 * @param pageCount - Total page count
 * @param paperWeight - Paper weight in pounds (e.g., 80, 100)
 * @param binding - Binding type
 * @returns Spine width in inches
 */
export function calculateSpineWidth(
  pageCount: number,
  paperWeight: number = 80,
  binding: 'hardcover' | 'softcover' | 'layflat' = 'softcover'
): number {
  // Paper thickness in inches per sheet
  // 80lb paper ≈ 0.004" per sheet
  // 100lb paper ≈ 0.005" per sheet
  const baseThickness = paperWeight / 20000

  // Number of sheets (2 pages per sheet)
  const sheets = Math.ceil(pageCount / 2)

  // Base spine width
  let spineWidth = sheets * baseThickness

  // Add cover board thickness for hardcover
  if (binding === 'hardcover') {
    spineWidth += 0.125 // Add 1/8" for cover boards
  }

  // Add minimum spine width for printing
  if (spineWidth < 0.0625) {
    spineWidth = 0.0625 // Minimum 1/16" spine
  }

  // Round to nearest 1/32"
  return Math.ceil(spineWidth * 32) / 32
}

/**
 * Convert normalized coordinates (0-1) to absolute coordinates
 *
 * @param normalizedX - X coordinate (0-1)
 * @param normalizedY - Y coordinate (0-1)
 * @param printArea - Print area to map to
 * @returns Absolute coordinates in inches
 */
export function normalizedToAbsolute(
  normalizedX: number,
  normalizedY: number,
  printArea: { x: number; y: number; width: number; height: number }
): PDFCoordinates {
  return {
    x: printArea.x + (normalizedX * printArea.width),
    y: printArea.y + (normalizedY * printArea.height)
  }
}

/**
 * Convert absolute coordinates to normalized (0-1)
 */
export function absoluteToNormalized(
  x: number,
  y: number,
  printArea: { x: number; y: number; width: number; height: number }
): { x: number; y: number } {
  return {
    x: (x - printArea.x) / printArea.width,
    y: (y - printArea.y) / printArea.height
  }
}

/**
 * Convert hex color to RGB
 */
export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`)
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  }
}

/**
 * Convert RGB to CMYK (simplified conversion)
 * For professional printing, use ICC color profiles
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns CMYK values (0-1)
 */
export function rgbToCMYK(
  r: number,
  g: number,
  b: number
): { c: number; m: number; y: number; k: number } {
  // Normalize RGB to 0-1
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  // Calculate K (black)
  const k = 1 - Math.max(rNorm, gNorm, bNorm)

  // Calculate CMY
  const c = k === 1 ? 0 : (1 - rNorm - k) / (1 - k)
  const m = k === 1 ? 0 : (1 - gNorm - k) / (1 - k)
  const y = k === 1 ? 0 : (1 - bNorm - k) / (1 - k)

  return { c, m, y, k }
}

/**
 * Convert hex color to CMYK
 */
export function hexToCMYK(hex: string): { c: number; m: number; y: number; k: number } {
  const { r, g, b } = hexToRGB(hex)
  return rgbToCMYK(r, g, b)
}

/**
 * Validate if an element is within the print area
 */
export function isWithinPrintArea(
  element: { x: number; y: number; width: number; height: number },
  printArea: { x: number; y: number; width: number; height: number }
): boolean {
  const elementRight = element.x + element.width
  const elementBottom = element.y + element.height
  const areaRight = printArea.x + printArea.width
  const areaBottom = printArea.y + printArea.height

  return (
    element.x >= printArea.x &&
    element.y >= printArea.y &&
    elementRight <= areaRight &&
    elementBottom <= areaBottom
  )
}

/**
 * Validate if an element extends into the bleed area
 */
export function isInBleedArea(
  element: { x: number; y: number; width: number; height: number },
  trimArea: { x: number; y: number; width: number; height: number },
  bleedArea: { x: number; y: number; width: number; height: number }
): boolean {
  const elementRight = element.x + element.width
  const elementBottom = element.y + element.height

  // Check if element extends beyond trim but within bleed
  return (
    (element.x < trimArea.x && element.x >= bleedArea.x) ||
    (element.y < trimArea.y && element.y >= bleedArea.y) ||
    (elementRight > trimArea.x + trimArea.width && elementRight <= bleedArea.x + bleedArea.width) ||
    (elementBottom > trimArea.y + trimArea.height && elementBottom <= bleedArea.y + bleedArea.height)
  )
}
