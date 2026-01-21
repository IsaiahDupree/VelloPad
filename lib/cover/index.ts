/**
 * Cover design utilities
 * Handles cover design configuration and rendering
 */

import { createClient } from '@/lib/supabase/server'

export interface CoverDesign {
  title: string
  subtitle?: string
  author?: string
  backgroundColor: string
  backgroundImageId?: string
  titleFont: {
    family: string
    size: number
    color: string
  }
  subtitleFont: {
    family: string
    size: number
    color: string
  }
  authorFont: {
    family: string
    size: number
    color: string
  }
  layout: 'centered' | 'top-aligned' | 'bottom-aligned' | 'split'
}

export interface SafeZones {
  bleed: number // inches
  safeArea: number // inches from edge
  spine: number // inches (calculated based on page count)
}

/**
 * Calculate safe zones based on trim size and page count
 */
export function calculateSafeZones(trimSize: string, pageCount: number): SafeZones {
  // Standard bleed for print is 0.125 inches (3mm)
  const bleed = 0.125

  // Safe area is typically 0.25 inches from trim edge
  const safeArea = 0.25

  // Spine width calculation (rough estimate)
  // Typically ~0.002 inches per page for standard paper
  const spine = Math.max(0.25, pageCount * 0.002)

  return {
    bleed,
    safeArea,
    spine
  }
}

/**
 * Get cover design for a book
 */
export async function getCoverDesign(bookId: string): Promise<CoverDesign | null> {
  const supabase = await createClient()

  const { data: book, error } = await supabase
    .from('books')
    .select(`
      title,
      subtitle,
      author,
      cover_background_color,
      cover_background_image_id,
      cover_title_font_family,
      cover_title_font_size,
      cover_title_color,
      cover_subtitle_font_family,
      cover_subtitle_font_size,
      cover_subtitle_color,
      cover_author_font_family,
      cover_author_font_size,
      cover_author_color,
      cover_layout
    `)
    .eq('id', bookId)
    .single()

  if (error || !book) {
    return null
  }

  return {
    title: book.title,
    subtitle: book.subtitle || undefined,
    author: book.author || undefined,
    backgroundColor: book.cover_background_color || '#FFFFFF',
    backgroundImageId: book.cover_background_image_id || undefined,
    titleFont: {
      family: book.cover_title_font_family || 'Georgia',
      size: book.cover_title_font_size || 48,
      color: book.cover_title_color || '#000000'
    },
    subtitleFont: {
      family: book.cover_subtitle_font_family || 'Georgia',
      size: book.cover_subtitle_font_size || 24,
      color: book.cover_subtitle_color || '#333333'
    },
    authorFont: {
      family: book.cover_author_font_family || 'Georgia',
      size: book.cover_author_font_size || 18,
      color: book.cover_author_color || '#666666'
    },
    layout: (book.cover_layout as CoverDesign['layout']) || 'centered'
  }
}

/**
 * Update cover design
 */
export async function updateCoverDesign(bookId: string, design: Partial<CoverDesign>): Promise<void> {
  const supabase = await createClient()

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString()
  }

  if (design.backgroundColor !== undefined) {
    updates.cover_background_color = design.backgroundColor
  }

  if (design.backgroundImageId !== undefined) {
    updates.cover_background_image_id = design.backgroundImageId
  }

  if (design.titleFont) {
    if (design.titleFont.family) updates.cover_title_font_family = design.titleFont.family
    if (design.titleFont.size) updates.cover_title_font_size = design.titleFont.size
    if (design.titleFont.color) updates.cover_title_color = design.titleFont.color
  }

  if (design.subtitleFont) {
    if (design.subtitleFont.family) updates.cover_subtitle_font_family = design.subtitleFont.family
    if (design.subtitleFont.size) updates.cover_subtitle_font_size = design.subtitleFont.size
    if (design.subtitleFont.color) updates.cover_subtitle_color = design.subtitleFont.color
  }

  if (design.authorFont) {
    if (design.authorFont.family) updates.cover_author_font_family = design.authorFont.family
    if (design.authorFont.size) updates.cover_author_font_size = design.authorFont.size
    if (design.authorFont.color) updates.cover_author_color = design.authorFont.color
  }

  if (design.layout) {
    updates.cover_layout = design.layout
  }

  const { error } = await supabase
    .from('books')
    .update(updates)
    .eq('id', bookId)

  if (error) {
    throw new Error(`Failed to update cover design: ${error.message}`)
  }
}

/**
 * Get available font families for cover design
 */
export function getAvailableFonts(): string[] {
  return [
    'Georgia',
    'Garamond',
    'Times New Roman',
    'Palatino',
    'Baskerville',
    'Bodoni',
    'Didot',
    'Caslon',
    'Century',
    'Bookman',
    'Arial',
    'Helvetica',
    'Futura',
    'Gill Sans',
    'Optima'
  ]
}

/**
 * Validate cover design
 */
export function validateCoverDesign(design: CoverDesign): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!design.title || design.title.trim().length === 0) {
    errors.push('Title is required')
  }

  if (design.title && design.title.length > 100) {
    errors.push('Title must be 100 characters or less')
  }

  if (design.subtitle && design.subtitle.length > 150) {
    errors.push('Subtitle must be 150 characters or less')
  }

  if (design.author && design.author.length > 100) {
    errors.push('Author name must be 100 characters or less')
  }

  if (design.titleFont.size < 12 || design.titleFont.size > 120) {
    errors.push('Title font size must be between 12 and 120')
  }

  if (design.subtitleFont.size < 10 || design.subtitleFont.size > 72) {
    errors.push('Subtitle font size must be between 10 and 72')
  }

  if (design.authorFont.size < 10 || design.authorFont.size > 48) {
    errors.push('Author font size must be between 10 and 48')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
