/**
 * MT-006: Tenant Template Overrides
 *
 * Allows tenants to override global templates with tenant-specific versions
 * Features:
 * - Store per-tenant template overrides
 * - Merge tenant overrides with global defaults
 * - Template versioning and rollback
 */

import { createClient } from '@/lib/supabase/server'
import {
  Template,
  TemplateConfig,
  TemplateCategory,
  InteriorTemplateConfig,
  CoverTemplateConfig,
  getTemplate,
} from '@/lib/templates/index'

export interface TenantTemplateOverride {
  id: string
  tenant_id: string
  template_id: string
  config_overrides: TemplateConfig
  is_active: boolean
  version: number
  created_at: string
  updated_at: string
}

/**
 * Get all template overrides for a tenant
 */
export async function getTenantTemplateOverrides(
  tenantId: string
): Promise<TenantTemplateOverride[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tenant_template_overrides')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[MT-006] Failed to get template overrides:', error)
      return []
    }

    return (data as TenantTemplateOverride[]) || []
  } catch (err) {
    console.error('[MT-006] Error getting template overrides:', err)
    return []
  }
}

/**
 * Get a specific template override for a tenant
 */
export async function getTenantTemplateOverride(
  tenantId: string,
  templateId: string
): Promise<TenantTemplateOverride | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tenant_template_overrides')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('template_id', templateId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('[MT-006] Failed to get template override:', error)
      return null
    }

    return data as TenantTemplateOverride
  } catch (err) {
    console.error('[MT-006] Error getting template override:', err)
    return null
  }
}

/**
 * Create or update a template override for a tenant
 */
export async function upsertTenantTemplateOverride(
  tenantId: string,
  templateId: string,
  configOverrides: TemplateConfig,
  isActive: boolean = true
): Promise<TenantTemplateOverride | null> {
  try {
    const supabase = await createClient()

    // Get current override to determine version
    const existing = await getTenantTemplateOverride(tenantId, templateId)
    const version = existing ? existing.version + 1 : 1

    // Deactivate previous versions
    if (existing) {
      await supabase
        .from('tenant_template_overrides')
        .update({ is_active: false })
        .eq('tenant_id', tenantId)
        .eq('template_id', templateId)
    }

    // Insert new version
    const { data, error } = await supabase
      .from('tenant_template_overrides')
      .insert([
        {
          tenant_id: tenantId,
          template_id: templateId,
          config_overrides: configOverrides,
          is_active: isActive,
          version: version,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[MT-006] Failed to upsert template override:', error)
      return null
    }

    return data as TenantTemplateOverride
  } catch (err) {
    console.error('[MT-006] Error upserting template override:', err)
    return null
  }
}

/**
 * Delete a template override (deactivate, not truly delete)
 */
export async function deleteTenantTemplateOverride(
  tenantId: string,
  templateId: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('tenant_template_overrides')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('template_id', templateId)

    if (error) {
      console.error('[MT-006] Failed to delete override:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[MT-006] Error deleting override:', err)
    return false
  }
}

/**
 * Get template with tenant overrides applied
 * Merges tenant overrides with the base template config
 */
export async function getTemplateWithTenantOverrides(
  tenantId: string,
  templateId: string
): Promise<Template | null> {
  try {
    const baseTemplate = await getTemplate(templateId)
    if (!baseTemplate) return null

    const override = await getTenantTemplateOverride(tenantId, templateId)
    if (!override) return baseTemplate

    // Merge tenant overrides with base config
    return {
      ...baseTemplate,
      config: deepMerge(baseTemplate.config, override.config_overrides),
    }
  } catch (err) {
    console.error('[MT-006] Error getting template with overrides:', err)
    return null
  }
}

/**
 * Get all templates with tenant overrides applied
 */
export async function getTemplatesWithTenantOverrides(
  tenantId: string,
  templates: Template[]
): Promise<Template[]> {
  try {
    const overrides = await getTenantTemplateOverrides(tenantId)
    const overrideMap = new Map(
      overrides.map((o) => [o.template_id, o])
    )

    return templates.map((template) => {
      const override = overrideMap.get(template.id)
      if (!override) return template

      return {
        ...template,
        config: deepMerge(template.config, override.config_overrides),
      }
    })
  } catch (err) {
    console.error('[MT-006] Error getting templates with overrides:', err)
    return templates
  }
}

/**
 * Revert a template override to a previous version
 */
export async function revertTenantTemplateOverride(
  tenantId: string,
  templateId: string,
  toVersion: number
): Promise<TenantTemplateOverride | null> {
  try {
    const supabase = await createClient()

    // Get the version to revert to
    const { data: versionToRevert } = await supabase
      .from('tenant_template_overrides')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('template_id', templateId)
      .eq('version', toVersion)
      .single()

    if (!versionToRevert) {
      console.error('[MT-006] Version not found')
      return null
    }

    // Deactivate current versions
    await supabase
      .from('tenant_template_overrides')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('template_id', templateId)

    // Create new version with reverted config
    const currentVersion = await getTenantTemplateOverride(tenantId, templateId)
    const newVersion = (currentVersion?.version || 0) + 1

    const { data, error } = await supabase
      .from('tenant_template_overrides')
      .insert([
        {
          tenant_id: tenantId,
          template_id: templateId,
          config_overrides: versionToRevert.config_overrides,
          is_active: true,
          version: newVersion,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[MT-006] Failed to revert override:', error)
      return null
    }

    return data as TenantTemplateOverride
  } catch (err) {
    console.error('[MT-006] Error reverting override:', err)
    return null
  }
}

/**
 * Get version history for a template override
 */
export async function getTenantTemplateOverrideHistory(
  tenantId: string,
  templateId: string
): Promise<TenantTemplateOverride[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tenant_template_overrides')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('template_id', templateId)
      .order('version', { ascending: false })

    if (error) {
      console.error('[MT-006] Failed to get override history:', error)
      return []
    }

    return (data as TenantTemplateOverride[]) || []
  } catch (err) {
    console.error('[MT-006] Error getting override history:', err)
    return []
  }
}

/**
 * Deep merge two objects (used to merge template configs)
 * Tenant overrides take precedence over base config
 */
function deepMerge<T extends Record<string, any>>(
  base: T,
  overrides: Partial<T>
): T {
  if (!overrides) return base
  if (!base) return overrides as T

  const result = { ...base }

  for (const key in overrides) {
    if (overrides.hasOwnProperty(key)) {
      const overrideValue = overrides[key]
      const baseValue = base[key]

      if (
        overrideValue &&
        typeof overrideValue === 'object' &&
        !Array.isArray(overrideValue) &&
        baseValue &&
        typeof baseValue === 'object' &&
        !Array.isArray(baseValue)
      ) {
        result[key] = deepMerge(baseValue, overrideValue)
      } else if (overrideValue !== undefined) {
        result[key] = overrideValue as any
      }
    }
  }

  return result
}

/**
 * Validate template config structure
 * Ensures config matches the template category requirements
 */
export function validateTemplateConfig(
  config: TemplateConfig,
  category: TemplateCategory
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (category === 'interior' || category === 'both') {
    const interiorConfig = config as InteriorTemplateConfig
    if (interiorConfig.margins) {
      if (typeof interiorConfig.margins.top !== 'number') {
        errors.push('Invalid margins.top: must be a number')
      }
      if (typeof interiorConfig.margins.bottom !== 'number') {
        errors.push('Invalid margins.bottom: must be a number')
      }
    }
    if (interiorConfig.fontSize) {
      if (typeof interiorConfig.fontSize.body !== 'number') {
        errors.push('Invalid fontSize.body: must be a number')
      }
    }
  }

  if (category === 'cover' || category === 'both') {
    const coverConfig = config as CoverTemplateConfig
    if (coverConfig.layout) {
      const validLayouts = ['centered', 'top-aligned', 'bottom-aligned', 'split']
      if (!validLayouts.includes(coverConfig.layout)) {
        errors.push(`Invalid layout: must be one of ${validLayouts.join(', ')}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
