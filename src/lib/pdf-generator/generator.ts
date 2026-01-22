/**
 * PDF Generation Engine
 * Core PDF generation using PDFKit with print-ready specifications
 *
 * @module pdf-generator/generator
 */

import PDFDocument from 'pdfkit'
import { promises as fs } from 'fs'
import { Readable } from 'stream'
import type {
  PDFSpec,
  PDFPage,
  PDFGenerationResult,
  PDFImageElement,
  PDFTextElement,
  PageSize
} from './types'
import {
  inchesToPoints,
  calculatePrintAreas,
  calculateDPI,
  hexToRGB
} from './utils'

/**
 * Generate a print-ready PDF from page definitions
 *
 * @param pages - Array of page definitions
 * @param spec - PDF specification
 * @param outputPath - Optional output file path
 * @returns PDF generation result
 */
export async function generatePDF(
  pages: PDFPage[],
  spec: PDFSpec,
  outputPath?: string
): Promise<PDFGenerationResult> {
  const startTime = Date.now()
  const warnings: string[] = []
  const errors: string[] = []

  try {
    // Calculate page dimensions with bleed
    const printAreas = calculatePrintAreas(spec.pageSize, spec)
    const pageWidth = inchesToPoints(printAreas.bleedArea.width)
    const pageHeight = inchesToPoints(printAreas.bleedArea.height)

    // Create PDF document
    const doc = new PDFDocument({
      size: [pageWidth, pageHeight],
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },
      autoFirstPage: false,
      bufferPages: true
    })

    // Collect PDF buffer
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    // Generate each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]

      // Add new page
      doc.addPage()

      // Draw background if specified
      if (page.backgroundColor) {
        const rgb = hexToRGB(page.backgroundColor)
        doc
          .rect(0, 0, pageWidth, pageHeight)
          .fill(rgb.r, rgb.g, rgb.b)
      }

      // Draw trim marks if requested
      if (spec.includeTrimMarks) {
        drawTrimMarks(doc, printAreas, spec)
      }

      // Draw elements
      for (const element of page.elements) {
        try {
          if (element.type === 'image') {
            await drawImageElement(doc, element as PDFImageElement, spec, warnings)
          } else if (element.type === 'text') {
            drawTextElement(doc, element as PDFTextElement, spec)
          }
        } catch (error) {
          const err = error as Error
          errors.push(`Page ${page.pageNumber}, element error: ${err.message}`)
        }
      }
    }

    // Finalize PDF
    doc.end()

    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })

    // Write to file if path provided
    if (outputPath) {
      await fs.writeFile(outputPath, pdfBuffer)
    }

    const generationTime = Date.now() - startTime

    return {
      success: errors.length === 0,
      pdfPath: outputPath,
      pdfBuffer,
      pageCount: pages.length,
      fileSize: pdfBuffer.length,
      warnings,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        generatedAt: new Date(),
        generationTime,
        spec
      }
    }
  } catch (error) {
    const err = error as Error
    return {
      success: false,
      pageCount: 0,
      fileSize: 0,
      warnings,
      errors: [err.message],
      metadata: {
        generatedAt: new Date(),
        generationTime: Date.now() - startTime,
        spec
      }
    }
  }
}

/**
 * Draw an image element on the PDF
 */
async function drawImageElement(
  doc: typeof PDFDocument.prototype,
  element: PDFImageElement,
  spec: PDFSpec,
  warnings: string[]
): Promise<void> {
  const x = inchesToPoints(element.x)
  const y = inchesToPoints(element.y)
  const width = inchesToPoints(element.width)
  const height = inchesToPoints(element.height)

  // Check DPI
  const dpiCheck = calculateDPI(
    element.image.width,
    element.image.height,
    element.width,
    element.height
  )

  if (dpiCheck.warningMessage) {
    warnings.push(`Image ${element.image.id}: ${dpiCheck.warningMessage}`)
  }

  // Load and draw image
  try {
    // For local files, read buffer
    let imageData: string | Buffer = element.image.url

    if (element.image.url.startsWith('http://') || element.image.url.startsWith('https://')) {
      // Fetch remote image
      const response = await fetch(element.image.url)
      const arrayBuffer = await response.arrayBuffer()
      imageData = Buffer.from(arrayBuffer)
    }

    // Apply rotation if specified
    if (element.rotation) {
      doc.save()
      doc.rotate(element.rotation, { origin: [x + width / 2, y + height / 2] })
    }

    // Draw image with fit mode
    const options: any = {
      width,
      height
    }

    if (element.fit === 'cover') {
      options.fit = [width, height]
      options.align = 'center'
      options.valign = 'center'
    } else if (element.fit === 'contain') {
      options.fit = [width, height]
    }

    doc.image(imageData, x, y, options)

    if (element.rotation) {
      doc.restore()
    }
  } catch (error) {
    const err = error as Error
    warnings.push(`Failed to load image ${element.image.id}: ${err.message}`)
  }
}

/**
 * Draw a text element on the PDF
 */
function drawTextElement(
  doc: typeof PDFDocument.prototype,
  element: PDFTextElement,
  spec: PDFSpec
): void {
  const x = inchesToPoints(element.x)
  const y = inchesToPoints(element.y)
  const width = inchesToPoints(element.width)
  const height = inchesToPoints(element.height)

  // Set font
  const fontWeight = element.fontWeight === 'bold' ? 'bold' : 'normal'
  try {
    doc.font(`${element.fontFamily}-${fontWeight}`)
  } catch {
    // Fallback to Helvetica if font not found
    doc.font('Helvetica')
  }

  // Set font size
  doc.fontSize(element.fontSize)

  // Set color
  const rgb = hexToRGB(element.color)
  doc.fillColor([rgb.r, rgb.g, rgb.b])

  // Apply rotation if specified
  if (element.rotation) {
    doc.save()
    doc.rotate(element.rotation, { origin: [x + width / 2, y + height / 2] })
  }

  // Draw text
  doc.text(element.content, x, y, {
    width,
    height,
    align: element.textAlign || 'left',
    lineBreak: true
  })

  if (element.rotation) {
    doc.restore()
  }
}

/**
 * Draw trim marks at corners
 */
function drawTrimMarks(
  doc: typeof PDFDocument.prototype,
  printAreas: ReturnType<typeof calculatePrintAreas>,
  spec: PDFSpec
): void {
  const trimX = inchesToPoints(printAreas.trimArea.x)
  const trimY = inchesToPoints(printAreas.trimArea.y)
  const trimWidth = inchesToPoints(printAreas.trimArea.width)
  const trimHeight = inchesToPoints(printAreas.trimArea.height)

  const markLength = inchesToPoints(0.25) // 1/4 inch marks
  const markOffset = inchesToPoints(0.125) // 1/8 inch from trim

  doc.strokeColor('black')
  doc.lineWidth(0.5)

  // Top-left
  doc.moveTo(trimX - markOffset, trimY).lineTo(trimX - markOffset - markLength, trimY).stroke()
  doc.moveTo(trimX, trimY - markOffset).lineTo(trimX, trimY - markOffset - markLength).stroke()

  // Top-right
  doc.moveTo(trimX + trimWidth + markOffset, trimY).lineTo(trimX + trimWidth + markOffset + markLength, trimY).stroke()
  doc.moveTo(trimX + trimWidth, trimY - markOffset).lineTo(trimX + trimWidth, trimY - markOffset - markLength).stroke()

  // Bottom-left
  doc.moveTo(trimX - markOffset, trimY + trimHeight).lineTo(trimX - markOffset - markLength, trimY + trimHeight).stroke()
  doc.moveTo(trimX, trimY + trimHeight + markOffset).lineTo(trimX, trimY + trimHeight + markOffset + markLength).stroke()

  // Bottom-right
  doc.moveTo(trimX + trimWidth + markOffset, trimY + trimHeight).lineTo(trimX + trimWidth + markOffset + markLength, trimY + trimHeight).stroke()
  doc.moveTo(trimX + trimWidth, trimY + trimHeight + markOffset).lineTo(trimX + trimWidth, trimY + trimHeight + markOffset + markLength).stroke()
}

/**
 * Create a PDF spec with default print settings
 */
export function createPrintSpec(pageSize: PageSize, options?: Partial<PDFSpec>): PDFSpec {
  return {
    pageSize,
    bleedInches: 0.125, // 3mm
    safeZoneInches: 0.25, // 6mm
    dpi: 300,
    colorSpace: 'CMYK',
    includeBleed: true,
    includeTrimMarks: false,
    includeCropMarks: false,
    ...options
  }
}
