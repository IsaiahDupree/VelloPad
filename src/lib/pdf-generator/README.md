# PDF Generator Module

Print-ready PDF generation for VelloPad photo books with professional printing specifications.

## Features

- ✅ **Print-ready PDFs** with 3mm bleed and 6mm safe zone
- ✅ **300 DPI support** with automatic DPI calculation and warnings
- ✅ **CMYK color space** conversion (simplified RGB to CMYK)
- ✅ **Cover PDF generation** with automatic spine width calculation
- ✅ **Trim marks** and crop marks for professional printing
- ✅ **Layout engine integration** for seamless photo book generation

## Installation

The module uses PDFKit for PDF generation:

```bash
npm install pdfkit @types/pdfkit
```

## Quick Start

### Generate Interior PDF

```typescript
import {
  generatePDF,
  createPrintSpec,
  convertLayoutsToPDFPages,
  STANDARD_PAGE_SIZES
} from '@/lib/pdf-generator'
import type { PageLayout } from '@/lib/layout-engine/types'

// 1. Get layouts from layout engine
const layouts: PageLayout[] = await generateLayout(photos, options)

// 2. Prepare photo metadata
const photoMap = new Map(
  photos.map(p => [p.id, {
    id: p.id,
    url: p.url,
    width: p.width,
    height: p.height,
    format: 'jpeg' as const
  }])
)

// 3. Create PDF spec
const spec = createPrintSpec(STANDARD_PAGE_SIZES['10x10'], {
  includeBleed: true,
  includeTrimMarks: false,
  colorSpace: 'CMYK'
})

// 4. Convert layouts to PDF pages
const pdfPages = convertLayoutsToPDFPages(layouts, photoMap, spec)

// 5. Generate PDF
const result = await generatePDF(pdfPages, spec, 'interior.pdf')

if (!result.success) {
  console.error('PDF generation failed:', result.errors)
} else {
  console.log(`PDF generated: ${result.fileSize} bytes`)
  console.log('Warnings:', result.warnings)
}
```

### Generate Cover PDF

```typescript
import {
  generateCoverPDF,
  createPrintSpec,
  STANDARD_PAGE_SIZES
} from '@/lib/pdf-generator'

const coverDesign = {
  frontCover: {
    backgroundColor: '#ffffff',
    title: 'My Photo Book',
    subtitle: 'A Year of Memories',
    author: 'John Doe',
    titleStyle: {
      fontSize: 48,
      fontFamily: 'Helvetica',
      color: '#000000',
      y: 2 // inches from top
    },
    subtitleStyle: {
      fontSize: 24,
      fontFamily: 'Helvetica',
      color: '#666666',
      y: 3
    },
    authorStyle: {
      fontSize: 18,
      fontFamily: 'Helvetica',
      color: '#333333',
      y: 9
    }
  },
  spine: {
    title: 'My Photo Book',
    author: 'John Doe',
    backgroundColor: '#f0f0f0',
    textColor: '#000000'
  },
  backCover: {
    backgroundColor: '#ffffff',
    blurb: 'A beautiful collection of memories from 2025...'
  }
}

const coverSpec = {
  pageCount: 48,
  paperWeight: 100,
  binding: 'softcover' as const
}

const spec = createPrintSpec(STANDARD_PAGE_SIZES['10x10'])

const result = await generateCoverPDF(
  coverDesign,
  STANDARD_PAGE_SIZES['10x10'],
  coverSpec,
  spec,
  'cover.pdf'
)
```

## Print Specifications

### Standard Bleed & Safe Zone

```typescript
PRINT_SPECS = {
  STANDARD_BLEED: 0.125,      // 3mm (1/8 inch)
  STANDARD_SAFE_ZONE: 0.25,   // 6mm (1/4 inch from trim)
  PRINT_DPI: 300,             // Professional print quality
  MIN_DPI: 150,               // Minimum acceptable quality
  SCREEN_DPI: 72              // Screen resolution
}
```

### Page Sizes

```typescript
STANDARD_PAGE_SIZES = {
  '8x8': { width: 8, height: 8, name: '8x8' },
  '10x10': { width: 10, height: 10, name: '10x10' },
  '12x12': { width: 12, height: 12, name: '12x12' },
  '8x11': { width: 8, height: 11, name: '8x11' },
  'letter': { width: 8.5, height: 11, name: 'Letter' },
  'A4': { width: 8.27, height: 11.69, name: 'A4' }
}
```

### Spine Width Calculation

Spine width is automatically calculated based on:
- Page count
- Paper weight (default 80lb)
- Binding type (hardcover/softcover/layflat)

Formula:
```
spine_width = (pages / 2) × paper_thickness + cover_boards
```

## DPI Validation

The module automatically calculates DPI when images are placed:

```typescript
const dpiCheck = calculateDPI(
  imageWidthPx,
  imageHeightPx,
  printWidthInches,
  printHeightInches
)

if (!dpiCheck.isPrintOptimal) {
  console.warn(dpiCheck.warningMessage)
}
```

## Color Space

The module supports both RGB and CMYK color spaces:

```typescript
// Convert hex to RGB
const rgb = hexToRGB('#FF5733')
// { r: 255, g: 87, b: 51 }

// Convert RGB to CMYK
const cmyk = rgbToCMYK(255, 87, 51)
// { c: 0, m: 0.659, y: 0.8, k: 0 }

// Or directly from hex
const cmyk = hexToCMYK('#FF5733')
```

**Note:** The CMYK conversion is simplified. For professional printing, use ICC color profiles.

## Print Areas

Each page has three areas:

1. **Bleed Area** - Total area including bleed (printed but trimmed)
2. **Trim Area** - Final page size after trimming
3. **Safe Area** - Content should stay within this area

```typescript
const printAreas = calculatePrintAreas(pageSize, spec)

console.log(printAreas.bleedArea)  // Full area with bleed
console.log(printAreas.trimArea)   // Final size
console.log(printAreas.safeArea)   // Safe content area
```

## Coordinate System

PDFKit uses points (1 inch = 72 points) with origin at top-left.

The module provides conversion utilities:

```typescript
// Convert inches to points
const points = inchesToPoints(1.5)  // 108 points

// Convert inches to pixels at 300 DPI
const pixels = inchesToPixels(1, 300)  // 300 pixels

// Convert normalized (0-1) to absolute inches
const coords = normalizedToAbsolute(0.5, 0.5, safeArea)
// Center of safe area in inches
```

## Error Handling

The generator returns detailed results:

```typescript
interface PDFGenerationResult {
  success: boolean
  pdfPath?: string
  pdfBuffer?: Buffer
  pageCount: number
  fileSize: number
  warnings: string[]       // Non-fatal issues
  errors?: string[]        // Fatal errors
  metadata: {
    generatedAt: Date
    generationTime: number  // ms
    spec: PDFSpec
  }
}
```

## Testing

See `e2e/pdf-generator.spec.ts` for E2E tests covering:
- Interior PDF generation
- Cover PDF generation
- DPI validation
- Bleed and safe zone calculations
- Spine width calculations

## Architecture

```
pdf-generator/
├── types.ts              # Type definitions
├── utils.ts              # Utility functions
├── generator.ts          # Core PDF generation
├── cover-generator.ts    # Cover-specific generation
├── layout-converter.ts   # Layout engine integration
├── index.ts              # Public API
└── README.md             # This file
```

## References

- **PRD:** Section 5 (Print + Buy Flow)
- **Feature:** PB-010 (Print-Ready PDF Generation)
- **Dependencies:** PB-006 (Layout Engine), PB-009 (Cover Editor)
- **Tech Stack:** PDFKit, Node.js fs/promises

## Future Enhancements

- [ ] ICC color profile support for professional CMYK
- [ ] PDF/X-1a:2001 compliance for commercial printing
- [ ] Embedded fonts support
- [ ] Barcode generation (ISBN-13, EAN-13)
- [ ] Image optimization and compression
- [ ] Multi-threaded PDF generation for large books
