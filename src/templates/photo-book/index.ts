/**
 * Photo Book Templates
 * Pre-built template definitions for photo books
 *
 * @module photo-book-templates
 * @see PB-007: Photo Book Templates
 */

import {
  LAYOUT_STYLE_RULES,
  LAYOUT_TEMPLATES,
  type LayoutStyle,
  type LayoutTemplate
} from '@/lib/layout-engine'

/**
 * Photo Book Template
 * Complete template definition including style, layouts, and metadata
 */
export interface PhotoBookTemplate {
  id: string
  name: string
  description: string
  style: LayoutStyle
  thumbnailUrl?: string
  previewImages?: string[]
  features: string[]
  bestFor: string[]
  layouts: LayoutTemplate[]
  photoRange: { min: number; max: number }
  popularity: number
}

/**
 * Pre-built Photo Book Templates
 * Classic, Collage, Magazine, Minimalist
 */
export const PHOTO_BOOK_TEMPLATES: Record<string, PhotoBookTemplate> = {
  classic: {
    id: 'classic',
    name: 'Classic Album',
    description: 'Traditional photo album style with clean, symmetric layouts. Perfect for family memories and timeless collections.',
    style: 'classic',
    features: [
      'Clean, symmetric layouts',
      '1-4 photos per page',
      'Consistent spacing',
      'Professional appearance',
      'Easy to navigate'
    ],
    bestFor: [
      'Family albums',
      'Wedding photos',
      'Baby books',
      'Graduation memories',
      'Anniversary gifts'
    ],
    layouts: ['single', 'double', 'grid-2x2'],
    photoRange: { min: 20, max: 200 },
    popularity: 100
  },

  collage: {
    id: 'collage',
    name: 'Dynamic Collage',
    description: 'Creative, dynamic layouts with multiple photos per page. Ideal for events, vacations, and storytelling.',
    style: 'collage',
    features: [
      'Multiple photos per page',
      'Dynamic arrangements',
      'Space-efficient',
      'Energetic feel',
      'Great for events'
    ],
    bestFor: [
      'Vacation albums',
      'Event coverage',
      'School yearbooks',
      'Party memories',
      'Travel journals'
    ],
    layouts: ['grid-2x2', 'grid-3x3', 'grid-2x3', 'asymmetric'],
    photoRange: { min: 50, max: 300 },
    popularity: 90
  },

  magazine: {
    id: 'magazine',
    name: 'Magazine Editorial',
    description: 'Bold, editorial-style layouts with striking compositions. Perfect for professional portfolios and feature presentations.',
    style: 'magazine',
    features: [
      'Editorial layouts',
      'Bold compositions',
      'Professional appearance',
      'Generous white space',
      'Focus on key images'
    ],
    bestFor: [
      'Photography portfolios',
      'Fashion lookbooks',
      'Architecture projects',
      'Product catalogs',
      'Corporate reports'
    ],
    layouts: ['single', 'double', 'asymmetric'],
    photoRange: { min: 15, max: 100 },
    popularity: 75
  },

  minimalist: {
    id: 'minimalist',
    name: 'Minimalist Gallery',
    description: 'Clean, spacious layouts emphasizing individual photos. Ideal for fine art photography and curated collections.',
    style: 'minimalist',
    features: [
      'Maximum white space',
      '1-2 photos per page',
      'Gallery-quality presentation',
      'Elegant simplicity',
      'Premium feel'
    ],
    bestFor: [
      'Fine art photography',
      'Portfolio books',
      'Nature photography',
      'Black & white collections',
      'Coffee table books'
    ],
    layouts: ['single', 'double'],
    photoRange: { min: 10, max: 60 },
    popularity: 60
  }
}

/**
 * Get all available templates
 */
export function getAllTemplates(): PhotoBookTemplate[] {
  return Object.values(PHOTO_BOOK_TEMPLATES)
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PhotoBookTemplate | null {
  return PHOTO_BOOK_TEMPLATES[id] || null
}

/**
 * Get templates sorted by popularity
 */
export function getPopularTemplates(limit: number = 4): PhotoBookTemplate[] {
  return getAllTemplates()
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
}

/**
 * Get templates suitable for a photo count
 */
export function getTemplatesForPhotoCount(photoCount: number): PhotoBookTemplate[] {
  return getAllTemplates().filter(
    template => photoCount >= template.photoRange.min && photoCount <= template.photoRange.max
  )
}

/**
 * Get recommended template based on photo count
 */
export function getRecommendedTemplate(photoCount: number): PhotoBookTemplate {
  // Default recommendations based on photo count
  if (photoCount <= 30) return PHOTO_BOOK_TEMPLATES.minimalist
  if (photoCount <= 60) return PHOTO_BOOK_TEMPLATES.magazine
  if (photoCount <= 100) return PHOTO_BOOK_TEMPLATES.classic
  return PHOTO_BOOK_TEMPLATES.collage
}

/**
 * Template metadata for UI display
 */
export const TEMPLATE_METADATA = {
  total: Object.keys(PHOTO_BOOK_TEMPLATES).length,
  styles: ['classic', 'collage', 'magazine', 'minimalist'] as const,
  defaultTemplate: 'classic'
}

// Re-export layout types for convenience
export type { LayoutStyle, LayoutTemplate }
export { LAYOUT_STYLE_RULES, LAYOUT_TEMPLATES }
