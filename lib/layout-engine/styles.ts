/**
 * Layout Style Rules
 * Defines behavior and preferences for different layout styles
 */

import { LayoutStyleRules, LayoutStyle } from './types'

/**
 * Style-specific layout rules
 */
export const LAYOUT_STYLE_RULES: Record<LayoutStyle, LayoutStyleRules> = {
  classic: {
    style: 'classic',
    name: 'Classic',
    description: 'Traditional photo album style with clean, symmetric layouts',
    templates: ['single', 'double', 'grid-2x2'],
    photosPerPageRange: { min: 1, max: 4 },
    spacing: {
      margin: 0.5, // inches
      gutter: 0.25 // inches
    },
    allowsRotation: false,
    allowsAsymmetry: false,
    preferredAspectRatios: [1, 1.5, 0.67] // square, 3:2, 2:3
  },

  collage: {
    style: 'collage',
    name: 'Collage',
    description: 'Dynamic, overlapping layouts with multiple photos per page',
    templates: ['grid-2x2', 'grid-3x3', 'grid-2x3', 'asymmetric'],
    photosPerPageRange: { min: 3, max: 9 },
    spacing: {
      margin: 0.25,
      gutter: 0.15
    },
    allowsRotation: true,
    allowsAsymmetry: true
  },

  magazine: {
    style: 'magazine',
    name: 'Magazine',
    description: 'Editorial-style layouts with bold, striking compositions',
    templates: ['single', 'double', 'asymmetric'],
    photosPerPageRange: { min: 1, max: 3 },
    spacing: {
      margin: 0.75,
      gutter: 0.5
    },
    allowsRotation: false,
    allowsAsymmetry: true,
    preferredAspectRatios: [0.67, 1.5] // portrait and landscape emphasis
  },

  minimalist: {
    style: 'minimalist',
    name: 'Minimalist',
    description: 'Clean, spacious layouts emphasizing individual photos',
    templates: ['single', 'double'],
    photosPerPageRange: { min: 1, max: 2 },
    spacing: {
      margin: 1.0,
      gutter: 0.75
    },
    allowsRotation: false,
    allowsAsymmetry: false,
    preferredAspectRatios: [1] // square emphasis
  }
}

/**
 * Get style rules by style name
 */
export function getStyleRules(style: LayoutStyle): LayoutStyleRules {
  return LAYOUT_STYLE_RULES[style]
}

/**
 * Get all available styles
 */
export function getAllStyles(): LayoutStyleRules[] {
  return Object.values(LAYOUT_STYLE_RULES)
}

/**
 * Check if a style allows a specific number of photos per page
 */
export function styleSupportsPhotoCount(style: LayoutStyle, count: number): boolean {
  const rules = getStyleRules(style)
  return count >= rules.photosPerPageRange.min && count <= rules.photosPerPageRange.max
}
