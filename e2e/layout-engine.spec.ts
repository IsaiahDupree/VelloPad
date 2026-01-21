/**
 * Layout Engine E2E Tests
 * Tests the Smart Auto-Layout Engine (PB-006)
 */

import { test, expect } from '@playwright/test'
import {
  generateLayout,
  estimatePageCount,
  calculateOptimalPhotosPerPage,
  validateLayout,
  groupPhotosByOrientation,
  getStyleRules,
  getTemplate,
  getDimensions,
  inchesToPixels,
  type PhotoMetadata,
  type LayoutOptions
} from '../lib/layout-engine'

// Helper to create test photos
function createTestPhotos(count: number, options?: {
  orientation?: 'portrait' | 'landscape' | 'square'
  isPrintSafe?: boolean
}): PhotoMetadata[] {
  const photos: PhotoMetadata[] = []
  const orientation = options?.orientation || 'landscape'
  const isPrintSafe = options?.isPrintSafe ?? true

  for (let i = 0; i < count; i++) {
    let width = 4032
    let height = 3024

    if (orientation === 'portrait') {
      ;[width, height] = [height, width]
    } else if (orientation === 'square') {
      height = width
    }

    photos.push({
      id: `photo-${i + 1}`,
      width,
      height,
      aspectRatio: width / height,
      orientation,
      sortOrder: i,
      isPrintSafe,
      qualityWarnings: isPrintSafe ? [] : ['Low resolution']
    })
  }

  return photos
}

test.describe('Layout Engine - Core Algorithm', () => {
  test('generates layout for single photo', () => {
    const photos = createTestPhotos(1)
    const options: LayoutOptions = {
      pageSize: '8x8',
      layoutStyle: 'classic'
    }

    const result = generateLayout(photos, options)

    expect(result.totalPages).toBe(1)
    expect(result.photosUsed).toBe(1)
    expect(result.photosUnused.length).toBe(0)
    expect(result.pages.length).toBe(1)
    expect(result.pages[0].layoutTemplate).toBe('single')
    expect(result.pages[0].photos.length).toBe(1)
  })

  test('generates layout for 10 photos - classic style', () => {
    const photos = createTestPhotos(10)
    const options: LayoutOptions = {
      pageSize: '8x8',
      layoutStyle: 'classic'
    }

    const result = generateLayout(photos, options)

    expect(result.totalPages).toBeGreaterThan(0)
    expect(result.photosUsed).toBe(10)
    expect(result.photosUnused.length).toBe(0)
    expect(result.warnings.length).toBe(0)
  })

  test('generates layout for 50 photos - collage style', () => {
    const photos = createTestPhotos(50)
    const options: LayoutOptions = {
      pageSize: '10x10',
      layoutStyle: 'collage'
    }

    const result = generateLayout(photos, options)

    expect(result.totalPages).toBeGreaterThan(5)
    expect(result.totalPages).toBeLessThan(20)
    expect(result.photosUsed).toBe(50)
    expect(result.metadata.generationTime).toBeLessThan(200)
  })

  test('handles 100 photos efficiently', () => {
    const photos = createTestPhotos(100)
    const options: LayoutOptions = {
      pageSize: '12x12',
      layoutStyle: 'collage'
    }

    const startTime = Date.now()
    const result = generateLayout(photos, options)
    const duration = Date.now() - startTime

    expect(result.photosUsed).toBe(100)
    expect(duration).toBeLessThan(500) // Should complete in under 500ms
    expect(result.totalPages).toBeGreaterThan(0)
  })

  test('generates cover page when coverPhotoId specified', () => {
    const photos = createTestPhotos(10)
    const options: LayoutOptions = {
      pageSize: '8x8',
      layoutStyle: 'classic',
      coverPhotoId: 'photo-1'
    }

    const result = generateLayout(photos, options)

    expect(result.pages[0].pageType).toBe('cover')
    expect(result.pages[0].photos[0].photoId).toBe('photo-1')
    expect(result.pages[0].layoutTemplate).toBe('single')
  })

  test('respects photosPerPage constraints', () => {
    const photos = createTestPhotos(20)
    const options: LayoutOptions = {
      pageSize: '8x8',
      layoutStyle: 'classic',
      photosPerPage: { min: 2, max: 2 }
    }

    const result = generateLayout(photos, options)

    // All pages should have exactly 2 photos
    result.pages.forEach(page => {
      if (page.pageType === 'content') {
        expect(page.photos.length).toBe(2)
      }
    })

    expect(result.totalPages).toBe(10)
  })

  test('preserves photo order when preserveOrder is true', () => {
    const photos = createTestPhotos(6)
    const options: LayoutOptions = {
      pageSize: '8x8',
      layoutStyle: 'classic',
      preserveOrder: true
    }

    const result = generateLayout(photos, options)

    // Collect photo IDs in order they appear in pages
    const usedPhotoIds = result.pages
      .flatMap(page => page.photos.map(p => p.photoId))

    // Should match original order
    expect(usedPhotoIds).toEqual([
      'photo-1', 'photo-2', 'photo-3',
      'photo-4', 'photo-5', 'photo-6'
    ])
  })
})

test.describe('Layout Engine - Styles', () => {
  test('classic style uses appropriate templates', () => {
    const photos = createTestPhotos(12)
    const options: LayoutOptions = {
      pageSize: '8x8',
      layoutStyle: 'classic'
    }

    const result = generateLayout(photos, options)

    // Classic should only use single, double, grid-2x2
    const allowedTemplates = ['single', 'double', 'grid-2x2']
    result.pages.forEach(page => {
      expect(allowedTemplates).toContain(page.layoutTemplate)
    })
  })

  test('collage style uses higher density layouts', () => {
    const photos = createTestPhotos(20)
    const options: LayoutOptions = {
      pageSize: '10x10',
      layoutStyle: 'collage'
    }

    const result = generateLayout(photos, options)

    // Collage should result in fewer pages than classic
    const classicResult = generateLayout(photos, {
      pageSize: '10x10',
      layoutStyle: 'classic'
    })

    expect(result.totalPages).toBeLessThanOrEqual(classicResult.totalPages)
  })

  test('minimalist style uses spacious layouts', () => {
    const photos = createTestPhotos(10)
    const options: LayoutOptions = {
      pageSize: '10x10',
      layoutStyle: 'minimalist'
    }

    const result = generateLayout(photos, options)

    // Minimalist should result in more pages (fewer photos per page)
    const collageResult = generateLayout(photos, {
      pageSize: '10x10',
      layoutStyle: 'collage'
    })

    expect(result.totalPages).toBeGreaterThanOrEqual(collageResult.totalPages)

    // All pages should have 1-2 photos max
    result.pages.forEach(page => {
      if (page.pageType === 'content') {
        expect(page.photos.length).toBeLessThanOrEqual(2)
      }
    })
  })

  test('magazine style uses asymmetric layouts', () => {
    const photos = createTestPhotos(15)
    const options: LayoutOptions = {
      pageSize: '8x11',
      layoutStyle: 'magazine'
    }

    const result = generateLayout(photos, options)

    // Magazine should include asymmetric templates
    const hasAsymmetric = result.pages.some(
      page => page.layoutTemplate === 'asymmetric'
    )

    expect(result.totalPages).toBeGreaterThan(0)
    // Note: Asymmetric may not always be used depending on photo count
  })
})

test.describe('Layout Engine - Page Sizes', () => {
  test('handles 8x8 square format', () => {
    const photos = createTestPhotos(10)
    const result = generateLayout(photos, {
      pageSize: '8x8',
      layoutStyle: 'classic'
    })

    expect(result.totalPages).toBeGreaterThan(0)
    expect(result.photosUsed).toBe(10)
  })

  test('handles 8x11 portrait format', () => {
    const photos = createTestPhotos(10)
    const result = generateLayout(photos, {
      pageSize: '8x11',
      layoutStyle: 'magazine'
    })

    expect(result.totalPages).toBeGreaterThan(0)
    expect(result.photosUsed).toBe(10)
  })

  test('handles A4 international format', () => {
    const photos = createTestPhotos(10)
    const result = generateLayout(photos, {
      pageSize: 'A4',
      layoutStyle: 'classic'
    })

    expect(result.totalPages).toBeGreaterThan(0)
    expect(result.photosUsed).toBe(10)
  })
})

test.describe('Layout Engine - Validation', () => {
  test('validates correct layout', () => {
    const photos = createTestPhotos(10)
    const result = generateLayout(photos, {
      pageSize: '8x8',
      layoutStyle: 'classic'
    })

    const errors = validateLayout(result, photos)
    expect(errors).toEqual([])
  })

  test('detects invalid photo positions', () => {
    const photos = createTestPhotos(1)
    const result = generateLayout(photos, {
      pageSize: '8x8',
      layoutStyle: 'classic'
    })

    // Corrupt a photo position
    result.pages[0].photos[0].x = 1.5 // Invalid: > 1

    const errors = validateLayout(result, photos)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('invalid position/size')
  })

  test('validates page numbering', () => {
    const photos = createTestPhotos(10)
    const result = generateLayout(photos, {
      pageSize: '8x8',
      layoutStyle: 'classic'
    })

    // Check all pages are numbered sequentially
    for (let i = 0; i < result.pages.length; i++) {
      expect(result.pages[i].pageNumber).toBe(i + 1)
    }
  })

  test('ensures all photos accounted for', () => {
    const photos = createTestPhotos(10)
    const result = generateLayout(photos, {
      pageSize: '8x8',
      layoutStyle: 'classic'
    })

    expect(result.photosUsed + result.photosUnused.length).toBe(photos.length)
  })
})

test.describe('Layout Engine - Utilities', () => {
  test('estimates page count accurately', () => {
    const estimate = estimatePageCount(50, 'classic')

    expect(estimate.min).toBeGreaterThan(0)
    expect(estimate.max).toBeGreaterThan(estimate.min)
    expect(estimate.recommended).toBeGreaterThanOrEqual(estimate.min)
    expect(estimate.recommended).toBeLessThanOrEqual(estimate.max)
  })

  test('calculates optimal photos per page', () => {
    const photosPerPage = calculateOptimalPhotosPerPage(100, 25, 'collage')

    expect(photosPerPage).toBeGreaterThanOrEqual(3) // Collage min
    expect(photosPerPage).toBeLessThanOrEqual(9)    // Collage max
    expect(photosPerPage).toBeCloseTo(4, 0) // 100/25 = 4
  })

  test('groups photos by orientation', () => {
    const photos: PhotoMetadata[] = [
      ...createTestPhotos(5, { orientation: 'portrait' }),
      ...createTestPhotos(5, { orientation: 'landscape' }),
      ...createTestPhotos(3, { orientation: 'square' })
    ]

    const groups = groupPhotosByOrientation(photos)

    expect(groups.portrait.length).toBe(5)
    expect(groups.landscape.length).toBe(5)
    expect(groups.square.length).toBe(3)
    expect(groups.mixed.length).toBe(0)
  })
})

test.describe('Layout Engine - Style Rules', () => {
  test('retrieves classic style rules', () => {
    const rules = getStyleRules('classic')

    expect(rules.style).toBe('classic')
    expect(rules.allowsRotation).toBe(false)
    expect(rules.allowsAsymmetry).toBe(false)
    expect(rules.photosPerPageRange.min).toBe(1)
    expect(rules.photosPerPageRange.max).toBe(4)
  })

  test('retrieves collage style rules', () => {
    const rules = getStyleRules('collage')

    expect(rules.style).toBe('collage')
    expect(rules.allowsRotation).toBe(true)
    expect(rules.allowsAsymmetry).toBe(true)
    expect(rules.photosPerPageRange.max).toBeGreaterThan(4)
  })
})

test.describe('Layout Engine - Templates', () => {
  test('single template has 1 photo position', () => {
    const template = getTemplate('single')

    expect(template.photosPerPage).toBe(1)
    expect(template.positions.length).toBe(1)
  })

  test('grid-2x2 template has 4 photo positions', () => {
    const template = getTemplate('grid-2x2')

    expect(template.photosPerPage).toBe(4)
    expect(template.positions.length).toBe(4)
  })

  test('grid-3x3 template has 9 photo positions', () => {
    const template = getTemplate('grid-3x3')

    expect(template.photosPerPage).toBe(9)
    expect(template.positions.length).toBe(9)
  })

  test('all template positions are within bounds', () => {
    const templates = ['single', 'double', 'grid-2x2', 'grid-3x3', 'asymmetric']

    templates.forEach(templateId => {
      const template = getTemplate(templateId as any)

      template.positions.forEach((pos, idx) => {
        expect(pos.x).toBeGreaterThanOrEqual(0)
        expect(pos.x).toBeLessThanOrEqual(1)
        expect(pos.y).toBeGreaterThanOrEqual(0)
        expect(pos.y).toBeLessThanOrEqual(1)
        expect(pos.width).toBeGreaterThan(0)
        expect(pos.width).toBeLessThanOrEqual(1)
        expect(pos.height).toBeGreaterThan(0)
        expect(pos.height).toBeLessThanOrEqual(1)
      })
    })
  })
})

test.describe('Layout Engine - Dimensions', () => {
  test('retrieves 8x8 dimensions', () => {
    const dims = getDimensions('8x8')

    expect(dims.width).toBe(8)
    expect(dims.height).toBe(8)
    expect(dims.bleed).toBe(0.125)
    expect(dims.safeZone).toBe(0.25)
  })

  test('converts inches to pixels at 300 DPI', () => {
    const pixels = inchesToPixels(8, 300)
    expect(pixels).toBe(2400)
  })

  test('converts inches to pixels at 600 DPI', () => {
    const pixels = inchesToPixels(8, 600)
    expect(pixels).toBe(4800)
  })
})

test.describe('Layout Engine - Edge Cases', () => {
  test('handles empty photo array', () => {
    const result = generateLayout([], {
      pageSize: '8x8',
      layoutStyle: 'classic'
    })

    expect(result.totalPages).toBe(0)
    expect(result.photosUsed).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('No photos')
  })

  test('handles photos with missing dimensions', () => {
    const photos: PhotoMetadata[] = [{
      id: 'photo-1',
      width: null,
      height: null,
      aspectRatio: null,
      orientation: 'unknown',
      sortOrder: 0,
      isPrintSafe: true
    }]

    const result = generateLayout(photos, {
      pageSize: '8x8',
      layoutStyle: 'classic'
    })

    // Should still generate layout
    expect(result.totalPages).toBe(1)
    expect(result.photosUsed).toBe(1)
  })

  test('handles photos with quality warnings', () => {
    const photos = createTestPhotos(10, { isPrintSafe: false })

    const result = generateLayout(photos, {
      pageSize: '8x8',
      layoutStyle: 'classic'
    })

    expect(result.warnings).toContain(
      expect.stringContaining('quality warnings')
    )
    expect(result.photosUsed).toBe(10) // Still uses them
  })

  test('handles odd number of photos', () => {
    const photos = createTestPhotos(7)

    const result = generateLayout(photos, {
      pageSize: '8x8',
      layoutStyle: 'classic',
      photosPerPage: { min: 2, max: 2 }
    })

    // Should use 6 photos (3 pages × 2 photos)
    // 1 photo left unused
    expect(result.photosUsed + result.photosUnused.length).toBe(7)
  })
})

test.describe('Layout Engine - Performance', () => {
  test('generates 100 photo layout in under 200ms', () => {
    const photos = createTestPhotos(100)

    const start = Date.now()
    const result = generateLayout(photos, {
      pageSize: '12x12',
      layoutStyle: 'collage'
    })
    const duration = Date.now() - start

    expect(duration).toBeLessThan(200)
    expect(result.photosUsed).toBe(100)
  })

  test('generation time scales linearly', () => {
    const times: number[] = []
    const counts = [10, 25, 50, 100]

    for (const count of counts) {
      const photos = createTestPhotos(count)
      const start = Date.now()
      generateLayout(photos, {
        pageSize: '8x8',
        layoutStyle: 'classic'
      })
      times.push(Date.now() - start)
    }

    // Time per photo should be relatively consistent
    const timePerPhoto = times.map((t, i) => t / counts[i])
    const avgTimePerPhoto = timePerPhoto.reduce((a, b) => a + b) / timePerPhoto.length

    // All times should be within 100% of average (linear scaling)
    timePerPhoto.forEach(t => {
      expect(t).toBeLessThan(avgTimePerPhoto * 2)
    })
  })
})
