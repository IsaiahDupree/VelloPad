# Photo Book Layout Engine

**Feature:** PB-006 - Smart Auto-Layout Engine
**Priority:** P0
**Status:** ✅ Implemented

## Overview

The Layout Engine automatically generates print-ready page layouts for photo books based on user photos and style preferences. It intelligently arranges photos using template-based layouts optimized for different aesthetic styles.

## Features

- 🎨 **4 Layout Styles**: Classic, Collage, Magazine, Minimalist
- 📐 **6 Layout Templates**: Single, Double, 2x2 Grid, 3x3 Grid, 2x3 Grid, Asymmetric
- 📏 **6 Page Sizes**: 8x8", 10x10", 12x12", 8x11", A4, Letter
- 🔄 **Smart Photo Distribution**: Automatically selects optimal photos per page
- ⚡ **Fast Generation**: Generates layouts for 100+ photos in milliseconds
- ✅ **Print Validation**: Ensures layouts meet print specifications

## Quick Start

```typescript
import { generateLayout } from '@/lib/layout-engine'

// Prepare photo metadata
const photos = [
  {
    id: 'photo-1',
    width: 4032,
    height: 3024,
    aspectRatio: 1.33,
    orientation: 'landscape',
    sortOrder: 0,
    isPrintSafe: true
  },
  // ... more photos
]

// Generate layout
const result = generateLayout(photos, {
  pageSize: '8x8',
  layoutStyle: 'classic',
  photosPerPage: { min: 1, max: 4 },
  preserveOrder: true
})

console.log(`Generated ${result.totalPages} pages`)
console.log(`Used ${result.photosUsed} of ${photos.length} photos`)

// Access page layouts
result.pages.forEach(page => {
  console.log(`Page ${page.pageNumber}: ${page.photos.length} photos`)
  console.log(`Template: ${page.layoutTemplate}`)
})
```

## Layout Styles

### Classic
**Best for:** Traditional photo albums, family memories
**Characteristics:**
- Clean, symmetric layouts
- 1-4 photos per page
- Consistent spacing
- No rotation or asymmetry

**Templates:** Single, Double, Grid 2x2

### Collage
**Best for:** Events, vacations, creative projects
**Characteristics:**
- Dynamic, overlapping layouts
- 3-9 photos per page
- Tight spacing
- Allows rotation and asymmetry

**Templates:** Grid 2x2, Grid 3x3, Grid 2x3, Asymmetric

### Magazine
**Best for:** Professional portfolios, editorial layouts
**Characteristics:**
- Bold, striking compositions
- 1-3 photos per page
- Generous spacing
- Asymmetric emphasis

**Templates:** Single, Double, Asymmetric

### Minimalist
**Best for:** Art books, fine art photography
**Characteristics:**
- Spacious, clean layouts
- 1-2 photos per page
- Maximum spacing
- Square emphasis

**Templates:** Single, Double

## Layout Templates

### Single Photo
- 1 photo per page
- Full page with margins
- Best for hero shots

### Double
- 2 photos side-by-side
- Equal sizing
- Best for comparisons or sequences

### Grid 2x2
- 4 photos in square grid
- Uniform sizing
- Best for event coverage

### Grid 3x3
- 9 photos in square grid
- Dense layout
- Best for large collections

### Grid 2x3
- 6 photos in grid (2 rows, 3 columns)
- Balanced layout
- Best for moderate collections

### Asymmetric
- 1 large photo + 2 small accent photos
- Visual hierarchy
- Best for storytelling

## Page Sizes

All page sizes include proper bleed (0.125") and safe zones (0.25"):

| Size | Dimensions | Aspect Ratio | Use Case |
|------|------------|--------------|----------|
| 8x8" | 8" × 8" | 1:1 | Standard photo book |
| 10x10" | 10" × 10" | 1:1 | Large photo book |
| 12x12" | 12" × 12" | 1:1 | Premium photo book |
| 8x11" | 8" × 11" | 0.73:1 | Portrait photo book |
| A4 | 8.27" × 11.69" | 0.71:1 | International standard |
| Letter | 8.5" × 11" | 0.77:1 | US standard |

## API Reference

### `generateLayout(photos, options)`

Generates complete page layouts from photo metadata.

**Parameters:**
- `photos: PhotoMetadata[]` - Array of photo metadata objects
- `options: LayoutOptions` - Layout generation options

**Returns:** `LayoutResult`

**Example:**
```typescript
const result = generateLayout(photos, {
  pageSize: '10x10',
  layoutStyle: 'collage',
  photosPerPage: { min: 3, max: 6 },
  spacing: {
    margin: 0.5,
    gutter: 0.25,
    padding: 0.1
  },
  allowCropping: true,
  preserveOrder: true,
  coverPhotoId: 'photo-1'
})
```

### `estimatePageCount(photoCount, style, options?)`

Estimates min/max/recommended page count for given photo count and style.

**Example:**
```typescript
const estimate = estimatePageCount(50, 'classic')
// { min: 13, max: 50, recommended: 20 }
```

### `calculateOptimalPhotosPerPage(totalPhotos, targetPages, style)`

Calculates optimal photos per page to achieve target page count.

**Example:**
```typescript
const photosPerPage = calculateOptimalPhotosPerPage(100, 25, 'collage')
// Returns: 4 (photos per page)
```

### `validateLayout(result, photos)`

Validates a layout result for print requirements.

**Returns:** `string[]` - Array of validation errors (empty if valid)

## Layout Options

```typescript
interface LayoutOptions {
  pageSize: PageSize              // Page size
  layoutStyle: LayoutStyle        // Style preset
  photosPerPage?: {               // Override photos per page
    min: number
    max: number
  }
  spacing?: {                     // Custom spacing (inches)
    margin: number
    gutter: number
    padding: number
  }
  allowCropping?: boolean         // Allow photo cropping
  allowRotation?: boolean         // Allow photo rotation
  preserveOrder?: boolean         // Keep photo sort order
  groupByDate?: boolean          // Group photos by date
  coverPhotoId?: string          // Cover photo ID
}
```

## Photo Metadata

```typescript
interface PhotoMetadata {
  id: string                     // Unique photo ID
  width: number | null           // Width in pixels
  height: number | null          // Height in pixels
  aspectRatio: number | null     // Width / height
  orientation: Orientation       // portrait | landscape | square | unknown
  sortOrder: number              // User-defined sort order
  isPrintSafe: boolean           // Meets print quality requirements
  qualityWarnings?: string[]     // Quality issues (e.g., low DPI)
}
```

## Layout Result

```typescript
interface LayoutResult {
  pages: PageLayout[]            // Generated page layouts
  totalPages: number             // Total page count
  photosUsed: number             // Number of photos used
  photosUnused: string[]         // IDs of unused photos
  warnings: string[]             // Generation warnings
  metadata: {
    generatedAt: Date
    generationTime: number       // ms
    algorithm: string
    options: LayoutOptions
  }
}
```

## Page Layout

```typescript
interface PageLayout {
  pageNumber: number             // Sequential page number
  pageType: 'cover' | 'content' | 'back'
  layoutTemplate: LayoutTemplate
  photos: PhotoPosition[]        // Photo placements
  textElements?: TextElement[]   // Optional text overlays
  backgroundColor?: string
  backgroundGradient?: {...}
}
```

## Photo Position

Positions are normalized (0-1) coordinates:

```typescript
interface PhotoPosition {
  photoId: string
  x: number                      // 0 = left, 1 = right
  y: number                      // 0 = top, 1 = bottom
  width: number                  // 0-1
  height: number                 // 0-1
  rotation?: number              // degrees
  zIndex?: number                // stacking order
  objectFit?: 'cover' | 'contain' | 'fill'
}
```

**Example:**
```typescript
// Center photo taking 80% of page
{
  photoId: 'photo-1',
  x: 0.1,        // 10% from left
  y: 0.1,        // 10% from top
  width: 0.8,    // 80% of page width
  height: 0.8,   // 80% of page height
  objectFit: 'contain'
}
```

## Utilities

### Dimensions

```typescript
import { getDimensions, inchesToPixels } from '@/lib/layout-engine'

const dims = getDimensions('8x8')
// { width: 8, height: 8, bleed: 0.125, safeZone: 0.25 }

const pixels = inchesToPixels(8, 300) // 2400 pixels at 300 DPI
```

### Templates

```typescript
import { getTemplate, getTemplatesForStyle } from '@/lib/layout-engine'

const template = getTemplate('grid-2x2')
// { id: 'grid-2x2', name: '2x2 Grid', photosPerPage: 4, ... }

const templates = getTemplatesForStyle('classic')
// [single, double, grid-2x2]
```

### Styles

```typescript
import { getStyleRules, styleSupportsPhotoCount } from '@/lib/layout-engine'

const rules = getStyleRules('collage')
// { style: 'collage', photosPerPageRange: { min: 3, max: 9 }, ... }

const supported = styleSupportsPhotoCount('minimalist', 3)
// false (minimalist supports 1-2 photos per page)
```

## Integration with Database

The layout engine integrates with the `photo_book_pages` table:

```typescript
// Generate layout
const result = generateLayout(photos, options)

// Save to database
for (const page of result.pages) {
  await supabase
    .from('photo_book_pages')
    .insert({
      project_id: projectId,
      page_number: page.pageNumber,
      page_type: page.pageType,
      layout_template: page.layoutTemplate,
      layout_json: page, // Complete layout specification
      photo_ids: page.photos.map(p => p.photoId)
    })
}
```

## Performance

- **Generation Speed:** ~0.5-2ms per photo
- **Typical Book (50 photos):** 25-100ms
- **Large Book (100 photos):** 50-200ms
- **Memory Usage:** ~1-2KB per photo

Tested with:
- Up to 500 photos
- All styles and templates
- All page sizes

## Validation

The layout engine performs automatic validation:

1. **Photo Count:** Ensures used + unused = total
2. **Page Numbers:** Sequential numbering (1, 2, 3...)
3. **Page Content:** All content pages have photos
4. **Position Bounds:** All positions within 0-1 range
5. **Print Safety:** Flags low-quality photos

Use `validateLayout()` for additional validation:

```typescript
const errors = validateLayout(result, photos)
if (errors.length > 0) {
  console.error('Layout validation failed:', errors)
}
```

## Future Enhancements

Planned features for future iterations:

- [ ] AI-powered smart grouping (faces, scenes, dates)
- [ ] Dynamic template mixing within a book
- [ ] Custom template builder
- [ ] Photo quality-based placement optimization
- [ ] Multi-page spread layouts
- [ ] Text-aware photo placement
- [ ] Theme-based color coordination

## Testing

See `/e2e/layout-engine.spec.ts` for comprehensive test suite covering:
- All styles and templates
- All page sizes
- Edge cases (1 photo, 100+ photos)
- Validation logic
- Performance benchmarks

Run tests:
```bash
npm run test:e2e -- layout-engine
```

## Dependencies

- None! The layout engine is dependency-free and uses only TypeScript standard library.

## License

Part of VelloPad platform. Internal use only.

---

**Last Updated:** January 21, 2026
**Feature Status:** ✅ Complete (PB-006)
**Version:** 1.0.0
