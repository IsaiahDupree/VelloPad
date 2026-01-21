/**
 * Layout Templates
 * Pre-defined page layout templates for different photo arrangements
 */

import { LayoutTemplateDefinition, LayoutTemplate } from './types'

/**
 * Template definitions for common layouts
 */
export const LAYOUT_TEMPLATES: Record<LayoutTemplate, LayoutTemplateDefinition> = {
  single: {
    id: 'single',
    name: 'Single Photo',
    description: 'One full-page photo with margins',
    photosPerPage: 1,
    positions: [
      {
        x: 0.1,
        y: 0.1,
        width: 0.8,
        height: 0.8,
        objectFit: 'contain'
      }
    ]
  },

  double: {
    id: 'double',
    name: 'Two Photos',
    description: 'Two photos side by side',
    photosPerPage: 2,
    positions: [
      {
        x: 0.05,
        y: 0.1,
        width: 0.425,
        height: 0.8,
        objectFit: 'cover'
      },
      {
        x: 0.525,
        y: 0.1,
        width: 0.425,
        height: 0.8,
        objectFit: 'cover'
      }
    ]
  },

  'grid-2x2': {
    id: 'grid-2x2',
    name: '2x2 Grid',
    description: 'Four photos in a 2x2 grid',
    photosPerPage: 4,
    positions: [
      { x: 0.05, y: 0.05, width: 0.425, height: 0.425, objectFit: 'cover' },
      { x: 0.525, y: 0.05, width: 0.425, height: 0.425, objectFit: 'cover' },
      { x: 0.05, y: 0.525, width: 0.425, height: 0.425, objectFit: 'cover' },
      { x: 0.525, y: 0.525, width: 0.425, height: 0.425, objectFit: 'cover' }
    ]
  },

  'grid-3x3': {
    id: 'grid-3x3',
    name: '3x3 Grid',
    description: 'Nine photos in a 3x3 grid',
    photosPerPage: 9,
    positions: Array.from({ length: 9 }, (_, i) => {
      const row = Math.floor(i / 3)
      const col = i % 3
      return {
        x: 0.033 + col * 0.32,
        y: 0.033 + row * 0.32,
        width: 0.287,
        height: 0.287,
        objectFit: 'cover' as const
      }
    })
  },

  'grid-2x3': {
    id: 'grid-2x3',
    name: '2x3 Grid',
    description: 'Six photos in a 2x3 grid',
    photosPerPage: 6,
    positions: Array.from({ length: 6 }, (_, i) => {
      const row = Math.floor(i / 3)
      const col = i % 3
      return {
        x: 0.033 + col * 0.32,
        y: 0.15 + row * 0.35,
        width: 0.287,
        height: 0.287,
        objectFit: 'cover' as const
      }
    })
  },

  asymmetric: {
    id: 'asymmetric',
    name: 'Asymmetric Layout',
    description: 'One large photo with smaller accent photos',
    photosPerPage: 3,
    positions: [
      {
        x: 0.05,
        y: 0.05,
        width: 0.6,
        height: 0.9,
        objectFit: 'cover',
        zIndex: 1
      },
      {
        x: 0.7,
        y: 0.05,
        width: 0.25,
        height: 0.4,
        objectFit: 'cover',
        zIndex: 2
      },
      {
        x: 0.7,
        y: 0.5,
        width: 0.25,
        height: 0.4,
        objectFit: 'cover',
        zIndex: 2
      }
    ]
  },

  custom: {
    id: 'custom',
    name: 'Custom Layout',
    description: 'User-defined custom layout',
    photosPerPage: 0,
    positions: []
  }
}

/**
 * Get a template by ID
 */
export function getTemplate(templateId: LayoutTemplate): LayoutTemplateDefinition {
  return LAYOUT_TEMPLATES[templateId]
}

/**
 * Get templates suitable for a specific number of photos
 */
export function getTemplatesForPhotoCount(count: number): LayoutTemplateDefinition[] {
  return Object.values(LAYOUT_TEMPLATES).filter(
    template => template.photosPerPage === count || template.id === 'custom'
  )
}

/**
 * Get templates for a style
 */
export function getTemplatesForStyle(style: string): LayoutTemplateDefinition[] {
  const styleTemplates: Record<string, LayoutTemplate[]> = {
    classic: ['single', 'double', 'grid-2x2'],
    collage: ['grid-2x2', 'grid-3x3', 'grid-2x3', 'asymmetric'],
    magazine: ['single', 'double', 'asymmetric'],
    minimalist: ['single', 'double']
  }

  const templates = styleTemplates[style] || Object.keys(LAYOUT_TEMPLATES)
  return templates.map(id => LAYOUT_TEMPLATES[id as LayoutTemplate])
}
