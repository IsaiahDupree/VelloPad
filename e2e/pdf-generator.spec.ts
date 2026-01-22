/**
 * E2E Tests for PDF Generator
 * Tests print-ready PDF generation with bleed, safe zones, and DPI validation
 *
 * @see PB-010: Print-Ready PDF Generation
 */

import { test, expect } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'
import {
  generatePDF,
  generateCoverPDF,
  createPrintSpec,
  convertLayoutsToPDFPages,
  calculateDPI,
  calculateSpineWidth,
  calculatePrintAreas,
  hexToCMYK,
  STANDARD_PAGE_SIZES,
  PRINT_SPECS
} from '@/src/lib/pdf-generator'
import type {
  PDFPage,
  PDFImageElement,
  PDFTextElement,
  CoverDesign
} from '@/src/lib/pdf-generator'

const TEST_OUTPUT_DIR = path.join(process.cwd(), 'test-output', 'pdf-generator')

test.beforeAll(async () => {
  // Create test output directory
  await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true })
})

test.describe('PDF Generator - PB-010', () => {
  test('should generate print-ready PDF with correct dimensions', async () => {
    // Create a simple test page
    const testPages: PDFPage[] = [
      {
        pageNumber: 1,
        pageType: 'content',
        elements: [
          {
            type: 'text',
            x: 1,
            y: 1,
            width: 6,
            height: 1,
            content: 'Test Page',
            fontSize: 24,
            fontFamily: 'Helvetica',
            color: '#000000'
          } as PDFTextElement
        ],
        backgroundColor: '#FFFFFF'
      }
    ]

    const spec = createPrintSpec(STANDARD_PAGE_SIZES['8x8'], {
      includeBleed: true,
      includeTrimMarks: false
    })

    const outputPath = path.join(TEST_OUTPUT_DIR, 'test-interior.pdf')
    const result = await generatePDF(testPages, spec, outputPath)

    // Assertions
    expect(result.success).toBe(true)
    expect(result.pageCount).toBe(1)
    expect(result.fileSize).toBeGreaterThan(0)
    expect(result.warnings).toBeDefined()

    // Verify file exists
    const stats = await fs.stat(outputPath)
    expect(stats.size).toBeGreaterThan(0)
  })

  test('should calculate correct bleed and safe zone areas', () => {
    const spec = createPrintSpec(STANDARD_PAGE_SIZES['10x10'])
    const printAreas = calculatePrintAreas(STANDARD_PAGE_SIZES['10x10'], spec)

    // Check bleed area (10x10 + 0.125" bleed on all sides = 10.25x10.25)
    expect(printAreas.bleedArea.width).toBeCloseTo(10.25, 2)
    expect(printAreas.bleedArea.height).toBeCloseTo(10.25, 2)

    // Check trim area (10x10)
    expect(printAreas.trimArea.width).toBe(10)
    expect(printAreas.trimArea.height).toBe(10)
    expect(printAreas.trimArea.x).toBeCloseTo(0.125, 3)
    expect(printAreas.trimArea.y).toBeCloseTo(0.125, 3)

    // Check safe area (10x10 - 0.25" safe zone on all sides = 9.5x9.5)
    expect(printAreas.safeArea.width).toBeCloseTo(9.5, 2)
    expect(printAreas.safeArea.height).toBeCloseTo(9.5, 2)
    expect(printAreas.safeArea.x).toBeCloseTo(0.375, 3) // bleed + safe zone
    expect(printAreas.safeArea.y).toBeCloseTo(0.375, 3)
  })

  test('should validate 300 DPI image resolution', () => {
    // Image at 300 DPI should be optimal
    const optimalDPI = calculateDPI(
      3000, // 3000px wide
      3000, // 3000px tall
      10,   // 10 inches wide
      10    // 10 inches tall
    )

    expect(optimalDPI.actualDPI).toBe(300)
    expect(optimalDPI.isPrintOptimal).toBe(true)
    expect(optimalDPI.isPrintSafe).toBe(true)
    expect(optimalDPI.warningMessage).toBeUndefined()

    // Image at 150 DPI should be safe but not optimal
    const safeDPI = calculateDPI(
      1500,
      1500,
      10,
      10
    )

    expect(safeDPI.actualDPI).toBe(150)
    expect(safeDPI.isPrintSafe).toBe(true)
    expect(safeDPI.isPrintOptimal).toBe(false)
    expect(safeDPI.warningMessage).toBeDefined()

    // Image at 100 DPI should not be safe
    const lowDPI = calculateDPI(
      1000,
      1000,
      10,
      10
    )

    expect(lowDPI.actualDPI).toBe(100)
    expect(lowDPI.isPrintSafe).toBe(false)
    expect(lowDPI.isPrintOptimal).toBe(false)
    expect(lowDPI.warningMessage).toContain('below minimum')
  })

  test('should calculate spine width correctly', () => {
    // 48-page book with 80lb paper, softcover
    const spineWidth48 = calculateSpineWidth(48, 80, 'softcover')
    expect(spineWidth48).toBeGreaterThan(0)
    expect(spineWidth48).toBeLessThan(0.5) // Should be reasonable

    // 200-page book should have wider spine
    const spineWidth200 = calculateSpineWidth(200, 80, 'softcover')
    expect(spineWidth200).toBeGreaterThan(spineWidth48)

    // Hardcover should be thicker than softcover
    const spineWidthHardcover = calculateSpineWidth(48, 80, 'hardcover')
    expect(spineWidthHardcover).toBeGreaterThan(spineWidth48)

    // 100lb paper should be thicker than 80lb
    const spineWidth100lb = calculateSpineWidth(48, 100, 'softcover')
    expect(spineWidth100lb).toBeGreaterThan(spineWidth48)
  })

  test('should generate cover PDF with spine', async () => {
    const coverDesign: CoverDesign = {
      frontCover: {
        backgroundColor: '#ffffff',
        title: 'Test Photo Book',
        subtitle: 'E2E Test',
        author: 'Playwright',
        titleStyle: {
          fontSize: 36,
          fontFamily: 'Helvetica',
          color: '#000000',
          y: 2
        },
        subtitleStyle: {
          fontSize: 18,
          fontFamily: 'Helvetica',
          color: '#666666',
          y: 3
        },
        authorStyle: {
          fontSize: 14,
          fontFamily: 'Helvetica',
          color: '#333333',
          y: 7
        }
      },
      spine: {
        title: 'Test Photo Book',
        author: 'Playwright',
        backgroundColor: '#f0f0f0',
        textColor: '#000000'
      },
      backCover: {
        backgroundColor: '#ffffff',
        blurb: 'This is a test photo book generated by E2E tests.'
      }
    }

    const coverSpec = {
      pageCount: 48,
      paperWeight: 80,
      binding: 'softcover' as const
    }

    const spec = createPrintSpec(STANDARD_PAGE_SIZES['8x8'])
    const outputPath = path.join(TEST_OUTPUT_DIR, 'test-cover.pdf')

    const result = await generateCoverPDF(
      coverDesign,
      STANDARD_PAGE_SIZES['8x8'],
      coverSpec,
      spec,
      outputPath
    )

    // Assertions
    expect(result.success).toBe(true)
    expect(result.pageCount).toBe(1)
    expect(result.fileSize).toBeGreaterThan(0)

    // Verify file exists
    const stats = await fs.stat(outputPath)
    expect(stats.size).toBeGreaterThan(0)
  })

  test('should convert hex colors to CMYK', () => {
    // Black
    const black = hexToCMYK('#000000')
    expect(black.c).toBe(0)
    expect(black.m).toBe(0)
    expect(black.y).toBe(0)
    expect(black.k).toBe(1)

    // White
    const white = hexToCMYK('#FFFFFF')
    expect(white.c).toBe(0)
    expect(white.m).toBe(0)
    expect(white.y).toBe(0)
    expect(white.k).toBeCloseTo(0, 5)

    // Red
    const red = hexToCMYK('#FF0000')
    expect(red.c).toBe(0)
    expect(red.m).toBeCloseTo(1, 1)
    expect(red.y).toBeCloseTo(1, 1)
    expect(red.k).toBe(0)

    // Cyan
    const cyan = hexToCMYK('#00FFFF')
    expect(cyan.c).toBeCloseTo(1, 1)
    expect(cyan.m).toBe(0)
    expect(cyan.y).toBe(0)
    expect(cyan.k).toBeCloseTo(0, 5)
  })

  test('should handle multi-page PDF generation', async () => {
    const testPages: PDFPage[] = []

    // Generate 5 test pages
    for (let i = 1; i <= 5; i++) {
      testPages.push({
        pageNumber: i,
        pageType: 'content',
        elements: [
          {
            type: 'text',
            x: 1,
            y: 4,
            width: 8,
            height: 1,
            content: `Page ${i}`,
            fontSize: 48,
            fontFamily: 'Helvetica',
            color: '#000000',
            textAlign: 'center'
          } as PDFTextElement
        ],
        backgroundColor: i % 2 === 0 ? '#f0f0f0' : '#ffffff'
      })
    }

    const spec = createPrintSpec(STANDARD_PAGE_SIZES['10x10'])
    const outputPath = path.join(TEST_OUTPUT_DIR, 'test-multipage.pdf')

    const result = await generatePDF(testPages, spec, outputPath)

    expect(result.success).toBe(true)
    expect(result.pageCount).toBe(5)
    expect(result.fileSize).toBeGreaterThan(0)
  })

  test('should validate standard print specifications', () => {
    expect(PRINT_SPECS.STANDARD_BLEED).toBe(0.125) // 3mm
    expect(PRINT_SPECS.STANDARD_SAFE_ZONE).toBe(0.25) // 6mm
    expect(PRINT_SPECS.PRINT_DPI).toBe(300)
    expect(PRINT_SPECS.MIN_DPI).toBe(150)
  })

  test('should support all standard page sizes', () => {
    const sizes = ['8x8', '10x10', '12x12', '8x11', 'letter', 'A4']

    for (const sizeName of sizes) {
      const size = STANDARD_PAGE_SIZES[sizeName]
      expect(size).toBeDefined()
      expect(size.width).toBeGreaterThan(0)
      expect(size.height).toBeGreaterThan(0)
      expect(size.name).toBe(sizeName === 'letter' ? 'Letter' : sizeName === 'A4' ? 'A4' : sizeName)
    }
  })

  test('should generate PDF with trim marks', async () => {
    const testPages: PDFPage[] = [
      {
        pageNumber: 1,
        pageType: 'content',
        elements: [],
        backgroundColor: '#FFFFFF'
      }
    ]

    const spec = createPrintSpec(STANDARD_PAGE_SIZES['8x8'], {
      includeBleed: true,
      includeTrimMarks: true
    })

    const outputPath = path.join(TEST_OUTPUT_DIR, 'test-trim-marks.pdf')
    const result = await generatePDF(testPages, spec, outputPath)

    expect(result.success).toBe(true)
    expect(result.fileSize).toBeGreaterThan(0)
  })

  test('should handle generation errors gracefully', async () => {
    const invalidPages: PDFPage[] = [
      {
        pageNumber: 1,
        pageType: 'content',
        elements: [
          {
            type: 'image',
            x: 1,
            y: 1,
            width: 3,
            height: 3,
            image: {
              id: 'invalid',
              url: '/nonexistent/image.jpg',
              width: 3000,
              height: 3000,
              format: 'jpeg'
            },
            fit: 'cover'
          } as PDFImageElement
        ]
      }
    ]

    const spec = createPrintSpec(STANDARD_PAGE_SIZES['8x8'])
    const result = await generatePDF(invalidPages, spec)

    // Should complete but with warnings about missing image
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('Failed to load image')
  })
})

test.describe('PDF Generator Integration', () => {
  test('should work with layout engine output', async () => {
    // Simulate layout engine output
    const mockLayout = {
      pages: [
        {
          pageNumber: 1,
          pageType: 'content' as const,
          layoutTemplate: 'single' as const,
          photos: [
            {
              photoId: 'photo1',
              x: 0.1,
              y: 0.1,
              width: 0.8,
              height: 0.8,
              objectFit: 'cover' as const
            }
          ]
        }
      ]
    }

    // Mock photo metadata
    const photoMap = new Map([
      ['photo1', {
        id: 'photo1',
        url: 'https://via.placeholder.com/3000x3000',
        width: 3000,
        height: 3000,
        format: 'jpeg' as const
      }]
    ])

    const spec = createPrintSpec(STANDARD_PAGE_SIZES['8x8'])
    const pdfPages = convertLayoutsToPDFPages(mockLayout.pages, photoMap, spec)

    expect(pdfPages).toHaveLength(1)
    expect(pdfPages[0].elements).toHaveLength(1)
    expect(pdfPages[0].elements[0].type).toBe('image')
  })
})
