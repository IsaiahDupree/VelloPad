/**
 * Layout Algorithm
 * Core auto-layout engine that generates page layouts from photos
 */

import {
  PhotoMetadata,
  PhotoPosition,
  PageLayout,
  LayoutOptions,
  LayoutResult,
  LayoutStyle,
  LayoutTemplate
} from './types'
import { getStyleRules } from './styles'
import { getTemplate, getTemplatesForStyle } from './templates'
import { getDimensions } from './dimensions'

/**
 * Main layout generation function
 * Takes photos and options, returns complete page layouts
 */
export function generateLayout(
  photos: PhotoMetadata[],
  options: LayoutOptions
): LayoutResult {
  const startTime = Date.now()
  const warnings: string[] = []

  // Validate inputs
  if (photos.length === 0) {
    return {
      pages: [],
      totalPages: 0,
      photosUsed: 0,
      photosUnused: [],
      warnings: ['No photos provided'],
      metadata: {
        generatedAt: new Date(),
        generationTime: 0,
        algorithm: 'empty',
        options
      }
    }
  }

  // Sort photos by sort order
  const sortedPhotos = [...photos].sort((a, b) => a.sortOrder - b.sortOrder)

  // Get style rules
  const styleRules = getStyleRules(options.layoutStyle)

  // Generate pages based on style
  const pages: PageLayout[] = []
  let photoIndex = 0
  let pageNumber = 1

  // Handle cover page if cover photo specified
  if (options.coverPhotoId) {
    const coverPhoto = sortedPhotos.find(p => p.id === options.coverPhotoId)
    if (coverPhoto) {
      pages.push(createCoverPage(coverPhoto, options))
      pageNumber++
    }
  }

  // Generate content pages
  while (photoIndex < sortedPhotos.length) {
    const remainingPhotos = sortedPhotos.slice(photoIndex)

    // Determine photos for this page
    const photosForPage = selectPhotosForPage(
      remainingPhotos,
      styleRules.photosPerPageRange,
      options
    )

    if (photosForPage.length === 0) break

    // Select template for these photos
    const template = selectTemplate(
      photosForPage,
      options.layoutStyle,
      styleRules
    )

    // Create page layout
    const page = createContentPage(
      photosForPage,
      template,
      pageNumber,
      options
    )

    pages.push(page)
    photoIndex += photosForPage.length
    pageNumber++
  }

  // Calculate unused photos
  const usedPhotoIds = new Set(
    pages.flatMap(page => page.photos.map(p => p.photoId))
  )
  const unusedPhotos = sortedPhotos
    .filter(p => !usedPhotoIds.has(p.id))
    .map(p => p.id)

  // Add warnings
  if (unusedPhotos.length > 0) {
    warnings.push(`${unusedPhotos.length} photos could not fit in the layout`)
  }

  const photosWithWarnings = photos.filter(
    p => p.qualityWarnings && p.qualityWarnings.length > 0
  )
  if (photosWithWarnings.length > 0) {
    warnings.push(`${photosWithWarnings.length} photos have quality warnings`)
  }

  return {
    pages,
    totalPages: pages.length,
    photosUsed: pages.reduce((sum, page) => sum + page.photos.length, 0),
    photosUnused: unusedPhotos,
    warnings,
    metadata: {
      generatedAt: new Date(),
      generationTime: Date.now() - startTime,
      algorithm: 'auto-layout-v1',
      options
    }
  }
}

/**
 * Create cover page layout
 */
function createCoverPage(
  photo: PhotoMetadata,
  options: LayoutOptions
): PageLayout {
  return {
    pageNumber: 1,
    pageType: 'cover',
    layoutTemplate: 'single',
    photos: [
      {
        photoId: photo.id,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        objectFit: 'cover'
      }
    ]
  }
}

/**
 * Create content page layout
 */
function createContentPage(
  photos: PhotoMetadata[],
  template: LayoutTemplate,
  pageNumber: number,
  options: LayoutOptions
): PageLayout {
  const templateDef = getTemplate(template)
  const photoPositions: PhotoPosition[] = []

  // Map photos to template positions
  for (let i = 0; i < Math.min(photos.length, templateDef.positions.length); i++) {
    const photo = photos[i]
    const position = templateDef.positions[i]

    photoPositions.push({
      photoId: photo.id,
      ...position
    })
  }

  return {
    pageNumber,
    pageType: 'content',
    layoutTemplate: template,
    photos: photoPositions
  }
}

/**
 * Select photos for next page
 */
function selectPhotosForPage(
  photos: PhotoMetadata[],
  photosPerPageRange: { min: number; max: number },
  options: LayoutOptions
): PhotoMetadata[] {
  // Use configured range or style range
  const min = options.photosPerPage?.min ?? photosPerPageRange.min
  const max = options.photosPerPage?.max ?? photosPerPageRange.max

  // For last page, use what's left if it's within range
  if (photos.length <= max) {
    return photos.length >= min ? photos : photos
  }

  // Try to use max photos per page
  return photos.slice(0, max)
}

/**
 * Select best template for photos
 */
function selectTemplate(
  photos: PhotoMetadata[],
  style: LayoutStyle,
  styleRules: any
): LayoutTemplate {
  const photoCount = photos.length
  const availableTemplates = getTemplatesForStyle(style)

  // Find exact match first
  const exactMatch = availableTemplates.find(
    t => t.photosPerPage === photoCount
  )
  if (exactMatch) return exactMatch.id

  // Find closest match
  const closest = availableTemplates
    .filter(t => t.photosPerPage <= photoCount)
    .sort((a, b) => b.photosPerPage - a.photosPerPage)[0]

  return closest?.id || 'single'
}

/**
 * Calculate optimal photos per page based on photo count
 */
export function calculateOptimalPhotosPerPage(
  totalPhotos: number,
  targetPages: number,
  style: LayoutStyle
): number {
  const styleRules = getStyleRules(style)
  const photosPerPage = Math.ceil(totalPhotos / targetPages)

  // Clamp to style range
  return Math.max(
    styleRules.photosPerPageRange.min,
    Math.min(photosPerPage, styleRules.photosPerPageRange.max)
  )
}

/**
 * Estimate page count for given photos and style
 */
export function estimatePageCount(
  photoCount: number,
  style: LayoutStyle,
  options?: Partial<LayoutOptions>
): { min: number; max: number; recommended: number } {
  const styleRules = getStyleRules(style)
  const minPhotosPerPage = options?.photosPerPage?.min ?? styleRules.photosPerPageRange.min
  const maxPhotosPerPage = options?.photosPerPage?.max ?? styleRules.photosPerPageRange.max

  const maxPages = Math.ceil(photoCount / minPhotosPerPage)
  const minPages = Math.ceil(photoCount / maxPhotosPerPage)

  // Recommended: balance between too sparse and too dense
  const avgPhotosPerPage = (minPhotosPerPage + maxPhotosPerPage) / 2
  const recommended = Math.ceil(photoCount / avgPhotosPerPage)

  return {
    min: minPages,
    max: maxPages,
    recommended
  }
}

/**
 * Group photos by orientation for better layouts
 */
export function groupPhotosByOrientation(photos: PhotoMetadata[]): {
  portrait: PhotoMetadata[]
  landscape: PhotoMetadata[]
  square: PhotoMetadata[]
  mixed: PhotoMetadata[]
} {
  const portrait: PhotoMetadata[] = []
  const landscape: PhotoMetadata[] = []
  const square: PhotoMetadata[] = []
  const mixed: PhotoMetadata[] = []

  for (const photo of photos) {
    if (photo.orientation === 'portrait') {
      portrait.push(photo)
    } else if (photo.orientation === 'landscape') {
      landscape.push(photo)
    } else if (photo.orientation === 'square') {
      square.push(photo)
    } else {
      mixed.push(photo)
    }
  }

  return { portrait, landscape, square, mixed }
}

/**
 * Validate layout result for print requirements
 */
export function validateLayout(
  result: LayoutResult,
  photos: PhotoMetadata[]
): string[] {
  const errors: string[] = []

  // Check all photos are used or unused is acceptable
  const usedCount = result.photosUsed
  const unusedCount = result.photosUnused.length
  const totalExpected = photos.length

  if (usedCount + unusedCount !== totalExpected) {
    errors.push('Photo count mismatch in layout result')
  }

  // Check page numbers are sequential
  const pageNumbers = result.pages.map(p => p.pageNumber).sort((a, b) => a - b)
  for (let i = 0; i < pageNumbers.length; i++) {
    if (pageNumbers[i] !== i + 1) {
      errors.push(`Page numbering is not sequential: missing page ${i + 1}`)
    }
  }

  // Check each page has photos
  for (const page of result.pages) {
    if (page.pageType === 'content' && page.photos.length === 0) {
      errors.push(`Page ${page.pageNumber} has no photos`)
    }
  }

  // Check photo positions are within bounds (0-1)
  for (const page of result.pages) {
    for (const photo of page.photos) {
      if (
        photo.x < 0 || photo.x > 1 ||
        photo.y < 0 || photo.y > 1 ||
        photo.width < 0 || photo.width > 1 ||
        photo.height < 0 || photo.height > 1
      ) {
        errors.push(
          `Page ${page.pageNumber}: Photo ${photo.photoId} has invalid position/size`
        )
      }
    }
  }

  return errors
}
