/**
 * Layout to PDF Converter
 * Converts layout engine output to PDF page definitions
 *
 * @module pdf-generator/layout-converter
 */

import type {
  PageLayout,
  PhotoPosition,
  TextElement as LayoutTextElement
} from '@/lib/layout-engine/types'
import type {
  PDFPage,
  PDFImageElement,
  PDFTextElement,
  PDFImage,
  PDFSpec
} from './types'
import { calculatePrintAreas, normalizedToAbsolute } from './utils'

/**
 * Photo metadata for PDF conversion
 */
export interface PhotoMetadata {
  id: string
  url: string
  width: number
  height: number
  format: 'jpeg' | 'png' | 'tiff'
}

/**
 * Convert layout engine pages to PDF pages
 *
 * @param layouts - Page layouts from layout engine
 * @param photos - Photo metadata map
 * @param spec - PDF specification
 * @returns PDF page definitions
 */
export function convertLayoutsToPDFPages(
  layouts: PageLayout[],
  photos: Map<string, PhotoMetadata>,
  spec: PDFSpec
): PDFPage[] {
  const printAreas = calculatePrintAreas(spec.pageSize, spec)
  const contentArea = printAreas.safeArea

  return layouts.map((layout) => {
    const pdfPage: PDFPage = {
      pageNumber: layout.pageNumber,
      pageType: mapPageType(layout.pageType),
      elements: [],
      backgroundColor: layout.backgroundColor
    }

    // Convert photo positions to PDF image elements
    for (const photoPos of layout.photos) {
      const photo = photos.get(photoPos.photoId)
      if (!photo) {
        console.warn(`Photo ${photoPos.photoId} not found in metadata map`)
        continue
      }

      // Convert normalized coordinates (0-1) to absolute inches
      const absolutePos = normalizedToAbsolute(
        photoPos.x,
        photoPos.y,
        contentArea
      )

      const absoluteWidth = photoPos.width * contentArea.width
      const absoluteHeight = photoPos.height * contentArea.height

      const imageElement: PDFImageElement = {
        type: 'image',
        x: absolutePos.x,
        y: absolutePos.y,
        width: absoluteWidth,
        height: absoluteHeight,
        rotation: photoPos.rotation,
        zIndex: photoPos.zIndex,
        image: {
          id: photo.id,
          url: photo.url,
          width: photo.width,
          height: photo.height,
          format: photo.format
        },
        fit: photoPos.objectFit || 'cover'
      }

      pdfPage.elements.push(imageElement)
    }

    // Convert text elements
    if (layout.textElements) {
      for (const textEl of layout.textElements) {
        const absolutePos = normalizedToAbsolute(
          textEl.x,
          textEl.y,
          contentArea
        )

        const absoluteWidth = textEl.width * contentArea.width
        const absoluteHeight = textEl.height * contentArea.height

        const textElement: PDFTextElement = {
          type: 'text',
          x: absolutePos.x,
          y: absolutePos.y,
          width: absoluteWidth,
          height: absoluteHeight,
          content: textEl.content,
          fontSize: textEl.fontSize,
          fontFamily: textEl.fontFamily || 'Helvetica',
          fontWeight: textEl.fontWeight === 'bold' ? 'bold' : 'normal',
          textAlign: textEl.textAlign,
          color: textEl.color || '#000000'
        }

        pdfPage.elements.push(textElement)
      }
    }

    // Sort elements by zIndex
    pdfPage.elements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))

    return pdfPage
  })
}

/**
 * Map layout page type to PDF page type
 */
function mapPageType(layoutPageType: string): PDFPage['pageType'] {
  switch (layoutPageType) {
    case 'cover':
      return 'cover-front'
    case 'back':
      return 'cover-back'
    default:
      return 'content'
  }
}

/**
 * Validate that all photos are available before PDF generation
 */
export function validatePhotos(
  layouts: PageLayout[],
  photos: Map<string, PhotoMetadata>
): { valid: boolean; missingPhotoIds: string[] } {
  const missingPhotoIds: string[] = []

  for (const layout of layouts) {
    for (const photoPos of layout.photos) {
      if (!photos.has(photoPos.photoId)) {
        missingPhotoIds.push(photoPos.photoId)
      }
    }
  }

  return {
    valid: missingPhotoIds.length === 0,
    missingPhotoIds: Array.from(new Set(missingPhotoIds))
  }
}
