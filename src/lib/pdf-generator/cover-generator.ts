/**
 * Cover PDF Generator
 * Generate print-ready cover PDFs with spine calculations
 *
 * @module pdf-generator/cover-generator
 */

import PDFDocument from 'pdfkit'
import { promises as fs } from 'fs'
import type {
  CoverSpec,
  PDFSpec,
  PageSize,
  PDFGenerationResult,
  PDFImage
} from './types'
import {
  inchesToPoints,
  calculateSpineWidth,
  hexToRGB
} from './utils'

/**
 * Cover design configuration
 */
export interface CoverDesign {
  frontCover: {
    backgroundImage?: PDFImage
    backgroundColor?: string
    title: string
    subtitle?: string
    author?: string
    titleStyle: {
      fontSize: number
      fontFamily: string
      color: string
      y: number // Position from top in inches
    }
    subtitleStyle?: {
      fontSize: number
      fontFamily: string
      color: string
      y: number
    }
    authorStyle?: {
      fontSize: number
      fontFamily: string
      color: string
      y: number
    }
  }
  spine?: {
    title: string
    author?: string
    backgroundColor?: string
    textColor?: string
  }
  backCover: {
    backgroundImage?: PDFImage
    backgroundColor?: string
    blurb?: string
    isbn?: string
    barcode?: {
      image: PDFImage
      position: { x: number; y: number } // inches from bottom-right
    }
  }
}

/**
 * Generate a complete cover PDF (front + spine + back)
 *
 * @param design - Cover design configuration
 * @param pageSize - Interior page size
 * @param coverSpec - Cover specification with page count
 * @param pdfSpec - PDF specification
 * @param outputPath - Optional output file path
 * @returns PDF generation result
 */
export async function generateCoverPDF(
  design: CoverDesign,
  pageSize: PageSize,
  coverSpec: CoverSpec,
  pdfSpec: PDFSpec,
  outputPath?: string
): Promise<PDFGenerationResult> {
  const startTime = Date.now()
  const warnings: string[] = []
  const errors: string[] = []

  try {
    // Calculate spine width
    const spineWidth = calculateSpineWidth(
      coverSpec.pageCount,
      coverSpec.paperWeight,
      coverSpec.binding
    )

    // Calculate cover dimensions
    const bleed = pdfSpec.includeBleed ? pdfSpec.bleedInches : 0
    const coverWidth = (pageSize.width * 2) + spineWidth + (bleed * 2)
    const coverHeight = pageSize.height + (bleed * 2)

    // Create PDF document
    const doc = new PDFDocument({
      size: [inchesToPoints(coverWidth), inchesToPoints(coverHeight)],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoFirstPage: true
    })

    // Collect PDF buffer
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    // Calculate areas
    const backCoverX = bleed
    const backCoverWidth = pageSize.width
    const spineX = bleed + pageSize.width
    const frontCoverX = bleed + pageSize.width + spineWidth
    const frontCoverWidth = pageSize.width

    // Draw back cover
    await drawBackCover(
      doc,
      design.backCover,
      backCoverX,
      bleed,
      backCoverWidth,
      pageSize.height,
      warnings
    )

    // Draw spine (if wide enough)
    if (spineWidth >= 0.125 && design.spine) {
      drawSpine(
        doc,
        design.spine,
        spineX,
        bleed,
        spineWidth,
        pageSize.height
      )
    }

    // Draw front cover
    await drawFrontCover(
      doc,
      design.frontCover,
      frontCoverX,
      bleed,
      frontCoverWidth,
      pageSize.height,
      warnings
    )

    // Draw trim marks if requested
    if (pdfSpec.includeTrimMarks) {
      drawCoverTrimMarks(
        doc,
        bleed,
        backCoverWidth,
        spineWidth,
        frontCoverWidth,
        pageSize.height
      )
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
      pageCount: 1,
      fileSize: pdfBuffer.length,
      warnings,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        generatedAt: new Date(),
        generationTime,
        spec: pdfSpec
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
        spec: pdfSpec
      }
    }
  }
}

/**
 * Draw front cover
 */
async function drawFrontCover(
  doc: typeof PDFDocument.prototype,
  design: CoverDesign['frontCover'],
  x: number,
  y: number,
  width: number,
  height: number,
  warnings: string[]
): Promise<void> {
  const xPt = inchesToPoints(x)
  const yPt = inchesToPoints(y)
  const widthPt = inchesToPoints(width)
  const heightPt = inchesToPoints(height)

  // Draw background
  if (design.backgroundColor) {
    const rgb = hexToRGB(design.backgroundColor)
    doc.rect(xPt, yPt, widthPt, heightPt).fill(rgb.r, rgb.g, rgb.b)
  }

  // Draw background image if provided
  if (design.backgroundImage) {
    try {
      let imageData: string | Buffer = design.backgroundImage.url

      if (design.backgroundImage.url.startsWith('http://') || design.backgroundImage.url.startsWith('https://')) {
        const response = await fetch(design.backgroundImage.url)
        const arrayBuffer = await response.arrayBuffer()
        imageData = Buffer.from(arrayBuffer)
      }

      doc.image(imageData, xPt, yPt, {
        width: widthPt,
        height: heightPt,
        fit: [widthPt, heightPt],
        align: 'center',
        valign: 'center'
      })
    } catch (error) {
      const err = error as Error
      warnings.push(`Failed to load front cover background image: ${err.message}`)
    }
  }

  // Draw title
  const titleY = inchesToPoints(y + design.titleStyle.y)
  const titleColor = hexToRGB(design.titleStyle.color)

  doc
    .font('Helvetica-Bold')
    .fontSize(design.titleStyle.fontSize)
    .fillColor([titleColor.r, titleColor.g, titleColor.b])
    .text(design.title, xPt, titleY, {
      width: widthPt,
      align: 'center'
    })

  // Draw subtitle if provided
  if (design.subtitle && design.subtitleStyle) {
    const subtitleY = inchesToPoints(y + design.subtitleStyle.y)
    const subtitleColor = hexToRGB(design.subtitleStyle.color)

    doc
      .font('Helvetica')
      .fontSize(design.subtitleStyle.fontSize)
      .fillColor([subtitleColor.r, subtitleColor.g, subtitleColor.b])
      .text(design.subtitle, xPt, subtitleY, {
        width: widthPt,
        align: 'center'
      })
  }

  // Draw author if provided
  if (design.author && design.authorStyle) {
    const authorY = inchesToPoints(y + design.authorStyle.y)
    const authorColor = hexToRGB(design.authorStyle.color)

    doc
      .font('Helvetica')
      .fontSize(design.authorStyle.fontSize)
      .fillColor([authorColor.r, authorColor.g, authorColor.b])
      .text(design.author, xPt, authorY, {
        width: widthPt,
        align: 'center'
      })
  }
}

/**
 * Draw spine
 */
function drawSpine(
  doc: typeof PDFDocument.prototype,
  design: CoverDesign['spine'],
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const xPt = inchesToPoints(x)
  const yPt = inchesToPoints(y)
  const widthPt = inchesToPoints(width)
  const heightPt = inchesToPoints(height)

  // Draw background
  if (design.backgroundColor) {
    const rgb = hexToRGB(design.backgroundColor)
    doc.rect(xPt, yPt, widthPt, heightPt).fill(rgb.r, rgb.g, rgb.b)
  }

  // Draw spine text (rotated 90 degrees)
  const textColor = hexToRGB(design.textColor || '#000000')
  const fontSize = Math.min(widthPt * 0.7, 14) // Scale to spine width

  doc.save()

  // Rotate and position text
  const centerX = xPt + widthPt / 2
  const centerY = yPt + heightPt / 2

  doc
    .translate(centerX, centerY)
    .rotate(90)
    .font('Helvetica-Bold')
    .fontSize(fontSize)
    .fillColor([textColor.r, textColor.g, textColor.b])
    .text(design.title, -heightPt / 2, -fontSize / 2, {
      width: heightPt,
      align: 'center'
    })

  doc.restore()
}

/**
 * Draw back cover
 */
async function drawBackCover(
  doc: typeof PDFDocument.prototype,
  design: CoverDesign['backCover'],
  x: number,
  y: number,
  width: number,
  height: number,
  warnings: string[]
): Promise<void> {
  const xPt = inchesToPoints(x)
  const yPt = inchesToPoints(y)
  const widthPt = inchesToPoints(width)
  const heightPt = inchesToPoints(height)

  // Draw background
  if (design.backgroundColor) {
    const rgb = hexToRGB(design.backgroundColor)
    doc.rect(xPt, yPt, widthPt, heightPt).fill(rgb.r, rgb.g, rgb.b)
  }

  // Draw background image if provided
  if (design.backgroundImage) {
    try {
      let imageData: string | Buffer = design.backgroundImage.url

      if (design.backgroundImage.url.startsWith('http://') || design.backgroundImage.url.startsWith('https://')) {
        const response = await fetch(design.backgroundImage.url)
        const arrayBuffer = await response.arrayBuffer()
        imageData = Buffer.from(arrayBuffer)
      }

      doc.image(imageData, xPt, yPt, {
        width: widthPt,
        height: heightPt,
        fit: [widthPt, heightPt],
        align: 'center',
        valign: 'center'
      })
    } catch (error) {
      const err = error as Error
      warnings.push(`Failed to load back cover background image: ${err.message}`)
    }
  }

  // Draw blurb if provided
  if (design.blurb) {
    const blurbMargin = inchesToPoints(0.5)
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('black')
      .text(design.blurb, xPt + blurbMargin, yPt + blurbMargin, {
        width: widthPt - (blurbMargin * 2),
        align: 'left'
      })
  }

  // Draw barcode if provided
  if (design.barcode) {
    try {
      const barcodeX = xPt + widthPt - inchesToPoints(design.barcode.position.x)
      const barcodeY = yPt + heightPt - inchesToPoints(design.barcode.position.y)

      let imageData: string | Buffer = design.barcode.image.url

      if (design.barcode.image.url.startsWith('http://') || design.barcode.image.url.startsWith('https://')) {
        const response = await fetch(design.barcode.image.url)
        const arrayBuffer = await response.arrayBuffer()
        imageData = Buffer.from(arrayBuffer)
      }

      doc.image(imageData, barcodeX, barcodeY, {
        fit: [inchesToPoints(2), inchesToPoints(1)]
      })
    } catch (error) {
      const err = error as Error
      warnings.push(`Failed to load barcode image: ${err.message}`)
    }
  }
}

/**
 * Draw trim marks for cover
 */
function drawCoverTrimMarks(
  doc: typeof PDFDocument.prototype,
  bleed: number,
  backWidth: number,
  spineWidth: number,
  frontWidth: number,
  height: number
): void {
  const markLength = inchesToPoints(0.25)
  const markOffset = inchesToPoints(0.125)

  doc.strokeColor('black').lineWidth(0.5)

  // Back cover trim marks
  const backLeft = inchesToPoints(bleed)
  const backRight = inchesToPoints(bleed + backWidth)
  const top = inchesToPoints(bleed)
  const bottom = inchesToPoints(bleed + height)

  // Spine trim marks
  const spineLeft = inchesToPoints(bleed + backWidth)
  const spineRight = inchesToPoints(bleed + backWidth + spineWidth)

  // Front cover trim marks
  const frontLeft = inchesToPoints(bleed + backWidth + spineWidth)
  const frontRight = inchesToPoints(bleed + backWidth + spineWidth + frontWidth)

  // Draw vertical marks at key positions
  const positions = [backLeft, backRight, spineLeft, spineRight, frontLeft, frontRight]

  for (const x of positions) {
    doc.moveTo(x, top - markOffset).lineTo(x, top - markOffset - markLength).stroke()
    doc.moveTo(x, bottom + markOffset).lineTo(x, bottom + markOffset + markLength).stroke()
  }
}
