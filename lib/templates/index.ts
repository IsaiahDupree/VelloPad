/**
 * Template system for book interior and cover designs
 * Provides utilities for managing and applying templates
 */

import { createClient } from '@/lib/supabase/server'

export type TemplateCategory = 'interior' | 'cover' | 'both'

export interface Template {
  id: string
  workspace_id: string | null
  name: string
  slug: string
  description: string | null
  category: TemplateCategory
  config: TemplateConfig
  preview_image_url: string | null
  thumbnail_url: string | null
  is_global: boolean
  is_featured: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

// Interior template configuration
export interface InteriorTemplateConfig {
  margins: {
    top: number
    bottom: number
    inner: number
    outer: number
  }
  fontSize: {
    body: number
    heading1: number
    heading2: number
    heading3: number
  }
  fontFamily: {
    body: string
    heading: string
  }
  lineHeight: number
  textAlign: 'left' | 'right' | 'center' | 'justify'
  pageNumbering: {
    enabled: boolean
    position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
    startPage: number
    format: 'arabic' | 'roman' | 'roman-lowercase'
  }
  headerFooter?: {
    header?: {
      enabled: boolean
      content: string
      align: 'left' | 'center' | 'right'
    }
    footer?: {
      enabled: boolean
      content: string
      align: 'left' | 'center' | 'right'
    }
  }
  chapterStart?: {
    pageBreak: boolean
    position: 'left' | 'right' | 'any'
  }
}

// Cover template configuration
export interface CoverTemplateConfig {
  layout: 'centered' | 'top-aligned' | 'bottom-aligned' | 'split'
  titleFont: {
    family: string
    size: number
    weight: number
    color: string
  }
  subtitleFont?: {
    family: string
    size: number
    weight: number
    color: string
  }
  authorFont: {
    family: string
    size: number
    weight: number
    color: string
  }
  backgroundColor?: string
  backgroundImage?: string
  overlayOpacity?: number
}

export type TemplateConfig = InteriorTemplateConfig | CoverTemplateConfig | Record<string, any>

/**
 * Get all templates (global + workspace-specific)
 */
export async function getTemplates(params?: {
  workspaceId?: string
  category?: TemplateCategory
  featuredOnly?: boolean
}): Promise<Template[]> {
  const supabase = await createClient()

  let query = supabase
    .from('templates')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('usage_count', { ascending: false })
    .order('name')

  // Include global templates and workspace-specific templates
  if (params?.workspaceId) {
    query = query.or(`is_global.eq.true,workspace_id.eq.${params.workspaceId}`)
  } else {
    query = query.eq('is_global', true)
  }

  if (params?.category) {
    query = query.or(`category.eq.${params.category},category.eq.both`)
  }

  if (params?.featuredOnly) {
    query = query.eq('is_featured', true)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch templates: ${error.message}`)
  }

  return data as Template[]
}

/**
 * Get a single template by ID
 */
export async function getTemplate(templateId: string): Promise<Template | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch template: ${error.message}`)
  }

  return data as Template
}

/**
 * Get a template by slug
 */
export async function getTemplateBySlug(slug: string, workspaceId?: string): Promise<Template | null> {
  const supabase = await createClient()

  let query = supabase
    .from('templates')
    .select('*')
    .eq('slug', slug)

  if (workspaceId) {
    query = query.or(`is_global.eq.true,workspace_id.eq.${workspaceId}`)
  } else {
    query = query.eq('is_global', true)
  }

  const { data, error } = await query.limit(1).single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch template: ${error.message}`)
  }

  return data as Template
}

/**
 * Create a new template (workspace-specific)
 */
export async function createTemplate(params: {
  workspaceId: string
  name: string
  slug: string
  description?: string
  category: TemplateCategory
  config: TemplateConfig
  previewImageUrl?: string
  thumbnailUrl?: string
}): Promise<Template> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  // Verify workspace access (owner or admin)
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    throw new Error('Only workspace owners and admins can create templates')
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({
      workspace_id: params.workspaceId,
      name: params.name,
      slug: params.slug,
      description: params.description,
      category: params.category,
      config: params.config,
      preview_image_url: params.previewImageUrl,
      thumbnail_url: params.thumbnailUrl,
      is_global: false,
      is_featured: false
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create template: ${error.message}`)
  }

  return data as Template
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  updates: {
    name?: string
    description?: string
    config?: TemplateConfig
    previewImageUrl?: string
    thumbnailUrl?: string
  }
): Promise<Template> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('templates')
    .update({
      name: updates.name,
      description: updates.description,
      config: updates.config,
      preview_image_url: updates.previewImageUrl,
      thumbnail_url: updates.thumbnailUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update template: ${error.message}`)
  }

  return data as Template
}

/**
 * Delete a template (workspace templates only)
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const supabase = await createClient()

  // Ensure it's not a global template
  const template = await getTemplate(templateId)
  if (!template) {
    throw new Error('Template not found')
  }

  if (template.is_global) {
    throw new Error('Cannot delete global templates')
  }

  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', templateId)

  if (error) {
    throw new Error(`Failed to delete template: ${error.message}`)
  }
}

/**
 * Increment template usage count
 */
export async function incrementTemplateUsage(templateId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('increment', {
    row_id: templateId,
    table_name: 'templates',
    column_name: 'usage_count'
  })

  if (error) {
    console.error('Failed to increment template usage:', error)
  }
}

/**
 * Apply template to a book
 */
export async function applyTemplateToBook(bookId: string, templateId: string): Promise<void> {
  const supabase = await createClient()

  const template = await getTemplate(templateId)
  if (!template) {
    throw new Error('Template not found')
  }

  // Update book with template configuration
  const { error } = await supabase
    .from('books')
    .update({
      interior_template_id: template.category === 'interior' || template.category === 'both' ? templateId : undefined,
      cover_template_id: template.category === 'cover' || template.category === 'both' ? templateId : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookId)

  if (error) {
    throw new Error(`Failed to apply template: ${error.message}`)
  }

  // Increment template usage
  await incrementTemplateUsage(templateId)
}

/**
 * Get default templates by category
 */
export function getDefaultTemplates(category: TemplateCategory): TemplateConfig {
  if (category === 'interior') {
    return {
      margins: { top: 1, bottom: 1, inner: 0.75, outer: 0.5 },
      fontSize: { body: 11, heading1: 18, heading2: 14, heading3: 12 },
      fontFamily: { body: 'Garamond', heading: 'Georgia' },
      lineHeight: 1.5,
      textAlign: 'justify' as const,
      pageNumbering: {
        enabled: true,
        position: 'bottom-center' as const,
        startPage: 1,
        format: 'arabic' as const
      },
      chapterStart: {
        pageBreak: true,
        position: 'any' as const
      }
    } as InteriorTemplateConfig
  } else {
    return {
      layout: 'centered' as const,
      titleFont: { family: 'Georgia', size: 48, weight: 700, color: '#000000' },
      subtitleFont: { family: 'Georgia', size: 24, weight: 400, color: '#333333' },
      authorFont: { family: 'Georgia', size: 18, weight: 400, color: '#666666' },
      backgroundColor: '#FFFFFF'
    } as CoverTemplateConfig
  }
}
