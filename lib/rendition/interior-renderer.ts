/**
 * Interior PDF Render Service
 * Generate print-ready multi-page interior PDF from user's page editor content
 *
 * Feature: PM-005 - Interior PDF Render Service
 */

import puppeteer, { type Browser, type Page } from 'puppeteer'
import type { PageLayout, LayoutElement } from '@/lib/adapters/custom-interior-adapter'
import type { PageSize } from '@/lib/adapters/notebook-adapter'

/**
 * Page dimensions in points (72 pts = 1 inch)
 */
export const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
  '5x8': { width: 360, height: 576 },        // 5" × 8"
  '5.5x8.5': { width: 396, height: 612 },    // 5.5" × 8.5"
  '6x9': { width: 432, height: 648 },        // 6" × 9"
  '7x10': { width: 504, height: 720 },       // 7" × 10"
  '8x10': { width: 576, height: 720 },       // 8" × 10"
  '8.5x11': { width: 612, height: 792 },     // 8.5" × 11" (Letter)
  'A4': { width: 595, height: 842 },         // 210mm × 297mm
  'A5': { width: 420, height: 595 }          // 148mm × 210mm
}

/**
 * Render configuration
 */
export interface RenderConfig {
  pageSize: PageSize
  colorMode: 'color' | 'bw' | 'grayscale'
  dpi: number
  bleed: number  // in mm
  safeZone: number  // in mm
  includeGuides?: boolean  // Show bleed and safe zone guides (for preview)
  quality?: number  // PDF quality (0-100)
}

/**
 * Render job result
 */
export interface RenderResult {
  success: boolean
  pdfUrl?: string
  pdfBuffer?: Buffer
  pageCount: number
  fileSize?: number
  errors?: string[]
  warnings?: string[]
  metadata: {
    pageSize: PageSize
    colorMode: string
    dpi: number
    renderTime: number
    timestamp: string
  }
}

/**
 * Interior PDF Renderer
 * Converts page layouts to print-ready PDF
 */
export class InteriorPDFRenderer {
  private browser: Browser | null = null
  private config: RenderConfig

  constructor(config: RenderConfig) {
    this.config = {
      dpi: 300,
      bleed: 3,
      safeZone: 6,
      includeGuides: false,
      quality: 95,
      ...config
    }
  }

  /**
   * Initialize Puppeteer browser
   */
  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      })
    }
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  /**
   * Render pages to PDF
   */
  async render(pages: PageLayout[]): Promise<RenderResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Initialize browser
      await this.initBrowser()

      // Validate pages
      const validationErrors = this.validatePages(pages)
      if (validationErrors.length > 0) {
        return {
          success: false,
          pageCount: pages.length,
          errors: validationErrors,
          metadata: {
            pageSize: this.config.pageSize,
            colorMode: this.config.colorMode,
            dpi: this.config.dpi,
            renderTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Create new page
      const browserPage = await this.browser!.newPage()

      // Set viewport for proper rendering
      const dimensions = PAGE_DIMENSIONS[this.config.pageSize]
      await browserPage.setViewport({
        width: dimensions.width,
        height: dimensions.height,
        deviceScaleFactor: this.config.dpi / 72 // Scale factor for DPI
      })

      // Generate HTML for all pages
      const html = this.generateHTML(pages)

      // Set content
      await browserPage.setContent(html, {
        waitUntil: 'networkidle0'
      })

      // Generate PDF
      const pdfBuffer = await browserPage.pdf({
        format: this.config.pageSize === '8.5x11' ? 'Letter' : undefined,
        width: dimensions.width,
        height: dimensions.height,
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      })

      await browserPage.close()

      // Convert buffer to base64 or upload to storage
      const pdfUrl = await this.uploadPDF(pdfBuffer)

      const renderTime = Date.now() - startTime

      return {
        success: true,
        pdfUrl,
        pdfBuffer,
        pageCount: pages.length,
        fileSize: pdfBuffer.length,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: {
          pageSize: this.config.pageSize,
          colorMode: this.config.colorMode,
          dpi: this.config.dpi,
          renderTime,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      errors.push(`Rendering failed: ${error instanceof Error ? error.message : String(error)}`)

      return {
        success: false,
        pageCount: pages.length,
        errors,
        metadata: {
          pageSize: this.config.pageSize,
          colorMode: this.config.colorMode,
          dpi: this.config.dpi,
          renderTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Validate pages before rendering
   */
  private validatePages(pages: PageLayout[]): string[] {
    const errors: string[] = []

    if (!pages || pages.length === 0) {
      errors.push('No pages provided for rendering')
      return errors
    }

    // Check for sequential page numbers
    const pageNumbers = pages.map(p => p.pageNumber).sort((a, b) => a - b)
    for (let i = 0; i < pageNumbers.length; i++) {
      if (pageNumbers[i] !== i + 1) {
        errors.push(`Missing page number: ${i + 1}`)
      }
    }

    // Check for duplicate page numbers
    const duplicates = pageNumbers.filter((num, index) => pageNumbers.indexOf(num) !== index)
    if (duplicates.length > 0) {
      errors.push(`Duplicate page numbers found: ${[...new Set(duplicates)].join(', ')}`)
    }

    // Validate each page
    pages.forEach((page, index) => {
      if (!page.pageNumber) {
        errors.push(`Page ${index}: missing page number`)
      }

      if (!page.elements) {
        errors.push(`Page ${page.pageNumber}: missing elements array`)
      }
    })

    return errors
  }

  /**
   * Generate HTML for all pages
   */
  private generateHTML(pages: PageLayout[]): string {
    const dimensions = PAGE_DIMENSIONS[this.config.pageSize]

    const pagesHTML = pages
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map(page => this.generatePageHTML(page, dimensions))
      .join('\n')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Interior PDF</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            @page {
              size: ${dimensions.width}pt ${dimensions.height}pt;
              margin: 0;
            }

            body {
              width: ${dimensions.width}pt;
              font-family: Arial, Helvetica, sans-serif;
            }

            .page {
              width: ${dimensions.width}pt;
              height: ${dimensions.height}pt;
              position: relative;
              page-break-after: always;
              overflow: hidden;
              ${this.config.colorMode === 'bw' ? 'filter: grayscale(100%);' : ''}
              ${this.config.colorMode === 'grayscale' ? 'filter: grayscale(100%);' : ''}
            }

            .page:last-child {
              page-break-after: auto;
            }

            .element {
              position: absolute;
            }

            .text-element {
              white-space: pre-wrap;
              word-wrap: break-word;
            }

            .image-element {
              object-fit: cover;
            }

            ${this.config.includeGuides ? this.getGuidesCSS() : ''}
          </style>
        </head>
        <body>
          ${pagesHTML}
        </body>
      </html>
    `
  }

  /**
   * Generate HTML for a single page
   */
  private generatePageHTML(page: PageLayout, dimensions: { width: number; height: number }): string {
    const elementsHTML = page.elements.map(element => this.generateElementHTML(element)).join('\n')

    return `
      <div class="page" data-page="${page.pageNumber}">
        ${this.config.includeGuides ? this.generateGuides(dimensions) : ''}
        ${elementsHTML}
      </div>
    `
  }

  /**
   * Generate HTML for a single element
   */
  private generateElementHTML(element: LayoutElement): string {
    switch (element.type) {
      case 'text':
        return this.generateTextElement(element)
      case 'image':
        return this.generateImageElement(element)
      case 'shape':
        return this.generateShapeElement(element)
      case 'line':
        return this.generateLineElement(element)
      default:
        return ''
    }
  }

  /**
   * Generate text element HTML
   */
  private generateTextElement(element: any): string {
    const styles = [
      `left: ${element.x}pt`,
      `top: ${element.y}pt`,
      `width: ${element.width}pt`,
      `height: ${element.height}pt`,
      `font-size: ${element.fontSize}pt`,
      `font-family: ${element.fontFamily || 'Arial'}`,
      `font-weight: ${element.fontWeight || 'normal'}`,
      `color: ${element.color || '#000000'}`,
      `text-align: ${element.alignment || 'left'}`,
      element.rotation ? `transform: rotate(${element.rotation}deg)` : ''
    ].filter(Boolean).join('; ')

    return `
      <div class="element text-element" style="${styles}">
        ${this.escapeHTML(element.content)}
      </div>
    `
  }

  /**
   * Generate image element HTML
   */
  private generateImageElement(element: any): string {
    const styles = [
      `left: ${element.x}pt`,
      `top: ${element.y}pt`,
      `width: ${element.width}pt`,
      `height: ${element.height}pt`,
      `opacity: ${element.opacity !== undefined ? element.opacity : 1}`,
      element.rotation ? `transform: rotate(${element.rotation}deg)` : ''
    ].filter(Boolean).join('; ')

    const fit = element.fit || 'cover'

    return `
      <img
        class="element image-element"
        src="${element.imageUrl}"
        style="${styles}; object-fit: ${fit};"
        alt=""
      />
    `
  }

  /**
   * Generate shape element HTML
   */
  private generateShapeElement(element: any): string {
    const styles = [
      `left: ${element.x}pt`,
      `top: ${element.y}pt`,
      `width: ${element.width}pt`,
      `height: ${element.height}pt`,
      `background-color: ${element.fill || 'transparent'}`,
      `border: ${element.strokeWidth || 0}pt solid ${element.stroke || 'transparent'}`,
      element.shape === 'circle' ? 'border-radius: 50%' : ''
    ].filter(Boolean).join('; ')

    return `
      <div class="element" style="${styles}"></div>
    `
  }

  /**
   * Generate line element HTML
   */
  private generateLineElement(element: any): string {
    const length = Math.sqrt(
      Math.pow(element.x2 - element.x1, 2) + Math.pow(element.y2 - element.y1, 2)
    )
    const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1) * (180 / Math.PI)

    const styles = [
      `left: ${element.x1}pt`,
      `top: ${element.y1}pt`,
      `width: ${length}pt`,
      `height: ${element.strokeWidth || 1}pt`,
      `background-color: ${element.stroke || '#000000'}`,
      `transform: rotate(${angle}deg)`,
      `transform-origin: 0 0`
    ].join('; ')

    return `
      <div class="element" style="${styles}"></div>
    `
  }

  /**
   * Generate bleed and safe zone guides
   */
  private generateGuides(dimensions: { width: number; height: number }): string {
    const bleedPt = (this.config.bleed / 25.4) * 72  // mm to points
    const safeZonePt = (this.config.safeZone / 25.4) * 72

    return `
      <div style="position: absolute; inset: 0; pointer-events: none;">
        <!-- Bleed guide -->
        <div style="
          position: absolute;
          left: ${bleedPt}pt;
          top: ${bleedPt}pt;
          right: ${bleedPt}pt;
          bottom: ${bleedPt}pt;
          border: 1px dashed rgba(255, 0, 0, 0.5);
        "></div>

        <!-- Safe zone guide -->
        <div style="
          position: absolute;
          left: ${safeZonePt}pt;
          top: ${safeZonePt}pt;
          right: ${safeZonePt}pt;
          bottom: ${safeZonePt}pt;
          border: 1px dashed rgba(0, 255, 0, 0.5);
        "></div>
      </div>
    `
  }

  /**
   * CSS for guides
   */
  private getGuidesCSS(): string {
    return `
      /* Guides visible only in preview mode */
      .page {
        outline: 1px solid #ccc;
      }
    `
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    const div = typeof document !== 'undefined' ? document.createElement('div') : null
    if (div) {
      div.textContent = text
      return div.innerHTML
    }

    // Fallback for server-side
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  /**
   * Upload PDF to storage and return URL
   * In production, this would upload to S3/R2/Supabase Storage
   */
  private async uploadPDF(buffer: Buffer): Promise<string> {
    // TODO: Implement actual upload to storage
    // For now, return data URL (not suitable for production)
    const base64 = buffer.toString('base64')
    return `data:application/pdf;base64,${base64}`
  }
}

/**
 * Create renderer instance
 */
export function createInteriorRenderer(config: RenderConfig): InteriorPDFRenderer {
  return new InteriorPDFRenderer(config)
}

/**
 * Quick render function for simple use cases
 */
export async function renderInteriorPDF(
  pages: PageLayout[],
  config: RenderConfig
): Promise<RenderResult> {
  const renderer = new InteriorPDFRenderer(config)

  try {
    const result = await renderer.render(pages)
    return result
  } finally {
    await renderer.close()
  }
}
