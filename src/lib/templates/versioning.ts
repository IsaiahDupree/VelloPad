/**
 * PM-006: Interior Template Versioning
 *
 * Tracks template versions so reprints reproduce exactly the same layout.
 * When a user creates a photo book or custom interior notebook with a template,
 * we lock in the specific template version so future reprints use the exact same styles.
 *
 * Features:
 * - Store template versions with all metadata and styling rules
 * - Retrieve locked template version for a specific rendition
 * - Enable reprints to use historically accurate template version
 * - Track template changes over time for audit/analysis
 */

import { createClient } from '@/lib/supabase/server'

export interface InteriorTemplateVersion {
  id: string
  template_id: string
  version: number
  name: string
  description?: string
  category: 'photo-book' | 'custom-interior' | 'notebook'
  config: {
    pageSize: {
      width: number
      height: number
      unit: 'mm' | 'inches'
    }
    margins: {
      top: number
      bottom: number
      left: number
      right: number
    }
    gutterMargin?: number
    headerHeight?: number
    footerHeight?: number
    fontSize: {
      body: number
      heading1: number
      heading2: number
      caption?: number
    }
    lineHeight: number
    fontFamily?: string
    textColor?: string
    backgroundColor?: string
    bleedWidth?: number
    safeZoneWidth?: number
    pageNumberPosition?: 'top' | 'bottom' | 'margin'
    columns?: number
    rowHeight?: number
    [key: string]: any // Allow additional config per category
  }
  isActive: boolean
  releaseNotes?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface TemplateVersionSnapshot {
  id: string
  renditionId: string // Photo book or custom interior rendition
  templateId: string
  templateVersion: number
  templateVersionId: string
  templateCategory: string
  templateConfig: InteriorTemplateVersion['config']
  snapshotDate: string
}

/**
 * Create a new template version
 * Called when a template is updated or published
 */
export async function createTemplateVersion(
  templateId: string,
  config: InteriorTemplateVersion['config'],
  metadata: {
    name: string
    description?: string
    category: InteriorTemplateVersion['category']
    releaseNotes?: string
    createdBy?: string
  }
): Promise<InteriorTemplateVersion | null> {
  try {
    const supabase = await createClient()

    // Get the highest version number for this template
    const { data: lastVersion } = await supabase
      .from('interior_template_versions')
      .select('version')
      .eq('template_id', templateId)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = (lastVersion?.version || 0) + 1

    const { data, error } = await supabase
      .from('interior_template_versions')
      .insert([
        {
          template_id: templateId,
          version: nextVersion,
          name: metadata.name,
          description: metadata.description,
          category: metadata.category,
          config: config,
          release_notes: metadata.releaseNotes,
          created_by: metadata.createdBy,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[PM-006] Failed to create template version:', error)
      return null
    }

    return mapDatabaseToInterface(data)
  } catch (err) {
    console.error('[PM-006] Error creating template version:', err)
    return null
  }
}

/**
 * Get a specific template version
 */
export async function getTemplateVersion(
  templateVersionId: string
): Promise<InteriorTemplateVersion | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('interior_template_versions')
      .select('*')
      .eq('id', templateVersionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('[PM-006] Failed to get template version:', error)
      return null
    }

    return mapDatabaseToInterface(data)
  } catch (err) {
    console.error('[PM-006] Error getting template version:', err)
    return null
  }
}

/**
 * Get the latest active version of a template
 */
export async function getLatestTemplateVersion(
  templateId: string
): Promise<InteriorTemplateVersion | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('interior_template_versions')
      .select('*')
      .eq('template_id', templateId)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('[PM-006] Failed to get latest template version:', error)
      return null
    }

    return mapDatabaseToInterface(data)
  } catch (err) {
    console.error('[PM-006] Error getting latest template version:', err)
    return null
  }
}

/**
 * Get all versions of a template (including inactive)
 */
export async function getTemplateVersionHistory(
  templateId: string
): Promise<InteriorTemplateVersion[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('interior_template_versions')
      .select('*')
      .eq('template_id', templateId)
      .order('version', { ascending: false })

    if (error) {
      console.error('[PM-006] Failed to get template version history:', error)
      return []
    }

    return (data || []).map(mapDatabaseToInterface)
  } catch (err) {
    console.error('[PM-006] Error getting template version history:', err)
    return []
  }
}

/**
 * Create a snapshot of a template version used for a specific rendition
 * This ensures reprints use the exact template version originally used
 */
export async function createTemplateVersionSnapshot(
  renditionId: string,
  templateId: string,
  templateVersionId: string,
  templateCategory: string
): Promise<TemplateVersionSnapshot | null> {
  try {
    const supabase = await createClient()

    // Get the template version to snapshot its config
    const templateVersion = await getTemplateVersion(templateVersionId)
    if (!templateVersion) {
      console.error('[PM-006] Template version not found for snapshot')
      return null
    }

    const { data, error } = await supabase
      .from('template_version_snapshots')
      .insert([
        {
          rendition_id: renditionId,
          template_id: templateId,
          template_version: templateVersion.version,
          template_version_id: templateVersionId,
          template_category: templateCategory,
          template_config: templateVersion.config,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[PM-006] Failed to create template version snapshot:', error)
      return null
    }

    return mapSnapshotDatabaseToInterface(data)
  } catch (err) {
    console.error('[PM-006] Error creating template version snapshot:', err)
    return null
  }
}

/**
 * Get the template version snapshot for a rendition
 * Used when reordering or getting details about a past order
 */
export async function getTemplateVersionSnapshot(
  renditionId: string
): Promise<TemplateVersionSnapshot | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('template_version_snapshots')
      .select('*')
      .eq('rendition_id', renditionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('[PM-006] Failed to get template version snapshot:', error)
      return null
    }

    return mapSnapshotDatabaseToInterface(data)
  } catch (err) {
    console.error('[PM-006] Error getting template version snapshot:', err)
    return null
  }
}

/**
 * Deactivate a template version
 * New projects won't use this version, but existing projects remain unchanged
 */
export async function deactivateTemplateVersion(
  templateVersionId: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('interior_template_versions')
      .update({ is_active: false })
      .eq('id', templateVersionId)

    if (error) {
      console.error('[PM-006] Failed to deactivate template version:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[PM-006] Error deactivating template version:', err)
    return false
  }
}

/**
 * Compare two template versions
 * Useful for understanding what changed between versions
 */
export function compareTemplateVersions(
  oldVersion: InteriorTemplateVersion,
  newVersion: InteriorTemplateVersion
): {
  changes: Record<string, { old: any; new: any }>
  hasMajorChanges: boolean
} {
  const changes: Record<string, { old: any; new: any }> = {}

  // Compare configs at top level
  const oldConfig = oldVersion.config
  const newConfig = newVersion.config

  const allKeys = new Set([
    ...Object.keys(oldConfig),
    ...Object.keys(newConfig),
  ])

  let hasMajorChanges = false

  for (const key of allKeys) {
    if (JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])) {
      changes[key] = {
        old: oldConfig[key],
        new: newConfig[key],
      }

      // Major changes include page size, margins, or safety zones
      if (
        key === 'pageSize' ||
        key === 'margins' ||
        key === 'safeZoneWidth' ||
        key === 'bleedWidth'
      ) {
        hasMajorChanges = true
      }
    }
  }

  return { changes, hasMajorChanges }
}

/**
 * Validate template configuration structure
 */
export function validateTemplateConfig(
  config: InteriorTemplateVersion['config']
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Required fields
  if (!config.pageSize || typeof config.pageSize !== 'object') {
    errors.push('pageSize is required and must be an object')
  } else {
    if (!config.pageSize.width || config.pageSize.width <= 0) {
      errors.push('pageSize.width must be a positive number')
    }
    if (!config.pageSize.height || config.pageSize.height <= 0) {
      errors.push('pageSize.height must be a positive number')
    }
    if (!['mm', 'inches'].includes(config.pageSize.unit)) {
      errors.push('pageSize.unit must be either "mm" or "inches"')
    }
  }

  if (!config.margins || typeof config.margins !== 'object') {
    errors.push('margins is required and must be an object')
  } else {
    if (typeof config.margins.top !== 'number' || config.margins.top < 0) {
      errors.push('margins.top must be a non-negative number')
    }
    if (typeof config.margins.bottom !== 'number' || config.margins.bottom < 0) {
      errors.push('margins.bottom must be a non-negative number')
    }
    if (typeof config.margins.left !== 'number' || config.margins.left < 0) {
      errors.push('margins.left must be a non-negative number')
    }
    if (typeof config.margins.right !== 'number' || config.margins.right < 0) {
      errors.push('margins.right must be a non-negative number')
    }
  }

  if (!config.fontSize || typeof config.fontSize !== 'object') {
    errors.push('fontSize is required and must be an object')
  } else {
    if (typeof config.fontSize.body !== 'number' || config.fontSize.body <= 0) {
      errors.push('fontSize.body must be a positive number')
    }
  }

  if (typeof config.lineHeight !== 'number' || config.lineHeight <= 0) {
    errors.push('lineHeight must be a positive number')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Helper functions for database mapping
function mapDatabaseToInterface(data: any): InteriorTemplateVersion {
  return {
    id: data.id,
    template_id: data.template_id,
    version: data.version,
    name: data.name,
    description: data.description,
    category: data.category,
    config: data.config,
    isActive: data.is_active,
    releaseNotes: data.release_notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    createdBy: data.created_by,
  }
}

function mapSnapshotDatabaseToInterface(data: any): TemplateVersionSnapshot {
  return {
    id: data.id,
    renditionId: data.rendition_id,
    templateId: data.template_id,
    templateVersion: data.template_version,
    templateVersionId: data.template_version_id,
    templateCategory: data.template_category,
    templateConfig: data.template_config,
    snapshotDate: data.created_at,
  }
}
