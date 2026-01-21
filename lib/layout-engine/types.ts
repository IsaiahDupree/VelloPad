/**
 * Layout Engine Types
 * Defines the data structures for photo book layout generation
 */

export type PageSize = '8x8' | '10x10' | '12x12' | '8x11' | 'A4' | 'letter'
export type LayoutStyle = 'classic' | 'collage' | 'magazine' | 'minimalist'
export type LayoutTemplate = 'single' | 'double' | 'grid-2x2' | 'grid-3x3' | 'grid-2x3' | 'asymmetric' | 'custom'
export type Orientation = 'portrait' | 'landscape' | 'square' | 'unknown'

/**
 * Photo metadata for layout decisions
 */
export interface PhotoMetadata {
  id: string
  width: number | null
  height: number | null
  aspectRatio: number | null
  orientation: Orientation
  sortOrder: number
  isPrintSafe: boolean
  qualityWarnings?: string[]
}

/**
 * Position of photo on page (0-1 normalized coordinates)
 */
export interface PhotoPosition {
  photoId: string
  x: number // 0-1 (left to right)
  y: number // 0-1 (top to bottom)
  width: number // 0-1
  height: number // 0-1
  rotation?: number // degrees
  zIndex?: number // for overlapping photos
  objectFit?: 'cover' | 'contain' | 'fill'
}

/**
 * Text element on page
 */
export interface TextElement {
  id: string
  content: string
  x: number // 0-1
  y: number // 0-1
  width: number // 0-1
  height: number // 0-1
  fontSize: number // points
  fontFamily?: string
  fontWeight?: string
  textAlign?: 'left' | 'center' | 'right'
  color?: string
}

/**
 * Complete page layout specification
 */
export interface PageLayout {
  pageNumber: number
  pageType: 'cover' | 'content' | 'back'
  layoutTemplate: LayoutTemplate
  photos: PhotoPosition[]
  textElements?: TextElement[]
  backgroundColor?: string
  backgroundGradient?: {
    type: 'linear' | 'radial'
    colors: string[]
    angle?: number
  }
}

/**
 * Layout generation options
 */
export interface LayoutOptions {
  pageSize: PageSize
  layoutStyle: LayoutStyle
  photosPerPage?: {
    min: number
    max: number
  }
  spacing?: {
    margin: number // inches
    gutter: number // inches
    padding: number // inches
  }
  allowCropping?: boolean
  allowRotation?: boolean
  preserveOrder?: boolean
  groupByDate?: boolean
  coverPhotoId?: string
}

/**
 * Page dimensions in inches
 */
export interface PageDimensions {
  width: number // inches
  height: number // inches
  bleed: number // inches (typically 0.125")
  safeZone: number // inches (typically 0.25")
}

/**
 * Layout generation result
 */
export interface LayoutResult {
  pages: PageLayout[]
  totalPages: number
  photosUsed: number
  photosUnused: string[]
  warnings: string[]
  metadata: {
    generatedAt: Date
    generationTime: number // ms
    algorithm: string
    options: LayoutOptions
  }
}

/**
 * Layout template definition
 */
export interface LayoutTemplateDefinition {
  id: LayoutTemplate
  name: string
  description: string
  photosPerPage: number
  positions: Omit<PhotoPosition, 'photoId'>[]
  supportedOrientations?: Orientation[]
  textAreas?: Omit<TextElement, 'id' | 'content'>[]
}

/**
 * Style-specific layout rules
 */
export interface LayoutStyleRules {
  style: LayoutStyle
  name: string
  description: string
  templates: LayoutTemplate[]
  photosPerPageRange: { min: number; max: number }
  spacing: {
    margin: number
    gutter: number
  }
  allowsRotation: boolean
  allowsAsymmetry: boolean
  preferredAspectRatios?: number[]
}
