/**
 * Layout Engine
 * Smart auto-layout system for photo book page generation
 *
 * @module layout-engine
 * @see PB-006: Smart Auto-Layout Engine
 */

// Core algorithm
export {
  generateLayout,
  calculateOptimalPhotosPerPage,
  estimatePageCount,
  groupPhotosByOrientation,
  validateLayout
} from './algorithm'

// Templates
export {
  LAYOUT_TEMPLATES,
  getTemplate,
  getTemplatesForPhotoCount,
  getTemplatesForStyle
} from './templates'

// Styles
export {
  LAYOUT_STYLE_RULES,
  getStyleRules,
  getAllStyles,
  styleSupportsPhotoCount
} from './styles'

// Dimensions
export {
  PAGE_DIMENSIONS,
  getDimensions,
  getPrintableArea,
  getContentArea,
  inchesToPixels,
  pixelsToInches,
  getDimensionsInPixels,
  getAspectRatio,
  isSquare,
  getPageOrientation
} from './dimensions'

// Types
export type {
  PageSize,
  LayoutStyle,
  LayoutTemplate,
  Orientation,
  PhotoMetadata,
  PhotoPosition,
  TextElement,
  PageLayout,
  LayoutOptions,
  PageDimensions,
  LayoutResult,
  LayoutTemplateDefinition,
  LayoutStyleRules
} from './types'
