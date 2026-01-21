/**
 * Tenant Resolution System
 *
 * Resolves the current tenant from the request hostname.
 * Supports:
 * - Main domain (vellopad.com) → Default tenant
 * - Subdomains (faith.vellopad.com) → Subdomain tenant
 * - Custom domains (faithbooks.com) → Custom domain tenant
 */

import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

export interface Tenant {
  id: string
  name: string
  slug: string
  domains: string[]
  brand_kit: BrandKit | null
  email_branding_id: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface BrandKit {
  // Colors
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string

  // Typography
  heading_font: string
  body_font: string

  // Logo & Branding
  logo_url?: string
  logo_dark_url?: string
  favicon_url?: string

  // Homepage Layout
  hero_variant: 'centered' | 'split' | 'minimal' | 'bold'
  homepage_sections: string[]

  // Voice & Tone
  tone: 'professional' | 'friendly' | 'inspirational' | 'educational'

  // Social Proof
  testimonials?: Array<{
    name: string
    quote: string
    role?: string
    avatar_url?: string
  }>

  // Custom CSS
  custom_css?: string
}

export interface TenantContext {
  tenant: Tenant | null
  hostname: string
  isCustomDomain: boolean
  isSubdomain: boolean
  isMainDomain: boolean
}

/**
 * Main tenant resolution function
 * Resolves tenant from hostname
 */
export async function resolveTenant(hostname: string): Promise<TenantContext> {
  const normalized = normalizeHostname(hostname)
  const mainDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'vellopad.com'

  // Check if this is the main domain
  if (normalized === mainDomain || normalized === `www.${mainDomain}`) {
    return {
      tenant: await getDefaultTenant(),
      hostname: normalized,
      isCustomDomain: false,
      isSubdomain: false,
      isMainDomain: true,
    }
  }

  // Check if this is a subdomain
  if (normalized.endsWith(`.${mainDomain}`)) {
    const slug = normalized.replace(`.${mainDomain}`, '')
    const tenant = await getTenantBySlug(slug)

    return {
      tenant,
      hostname: normalized,
      isCustomDomain: false,
      isSubdomain: true,
      isMainDomain: false,
    }
  }

  // Check if this is a custom domain
  const tenant = await getTenantByDomain(normalized)

  return {
    tenant,
    hostname: normalized,
    isCustomDomain: true,
    isSubdomain: false,
    isMainDomain: false,
  }
}

/**
 * Normalize hostname (remove port, lowercase)
 */
export function normalizeHostname(hostname: string): string {
  return hostname
    .split(':')[0] // Remove port
    .toLowerCase()
    .trim()
}

/**
 * Get tenant by slug (subdomain)
 * Example: faith.vellopad.com → slug: faith
 */
export const getTenantBySlug = cache(async (slug: string): Promise<Tenant | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('enabled', true)
    .single()

  if (error || !data) {
    console.error('Error fetching tenant by slug:', error)
    return null
  }

  return data as Tenant
})

/**
 * Get tenant by custom domain
 * Example: faithbooks.com → domains: ['faithbooks.com']
 */
export const getTenantByDomain = cache(async (domain: string): Promise<Tenant | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .contains('domains', [domain])
    .eq('enabled', true)
    .single()

  if (error || !data) {
    console.error('Error fetching tenant by domain:', error)
    return null
  }

  return data as Tenant
})

/**
 * Get default tenant (for main domain)
 */
export const getDefaultTenant = cache(async (): Promise<Tenant | null> => {
  const supabase = await createClient()

  // Get the tenant with slug 'default' or the first tenant
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', 'default')
    .eq('enabled', true)
    .single()

  if (error || !data) {
    console.warn('No default tenant found, using first tenant')

    // Fallback: get first tenant
    const { data: fallback } = await supabase
      .from('tenants')
      .select('*')
      .eq('enabled', true)
      .limit(1)
      .single()

    return fallback as Tenant | null
  }

  return data as Tenant
})

/**
 * Get tenant by ID
 */
export const getTenantById = cache(async (tenantId: string): Promise<Tenant | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .eq('enabled', true)
    .single()

  if (error || !data) {
    console.error('Error fetching tenant by ID:', error)
    return null
  }

  return data as Tenant
})

/**
 * Get all enabled tenants
 */
export async function getAllTenants(): Promise<Tenant[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('enabled', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all tenants:', error)
    return []
  }

  return data as Tenant[]
}

/**
 * Create new tenant
 */
export async function createTenant(params: {
  name: string
  slug: string
  domains?: string[]
  brand_kit?: BrandKit
  email_branding_id?: string
}): Promise<Tenant | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .insert([
      {
        name: params.name,
        slug: params.slug,
        domains: params.domains || [],
        brand_kit: params.brand_kit || null,
        email_branding_id: params.email_branding_id || null,
        enabled: true,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Error creating tenant:', error)
    return null
  }

  return data as Tenant
}

/**
 * Update tenant
 */
export async function updateTenant(
  tenantId: string,
  updates: Partial<Omit<Tenant, 'id' | 'created_at' | 'updated_at'>>
): Promise<Tenant | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating tenant:', error)
    return null
  }

  return data as Tenant
}

/**
 * Disable tenant (soft delete)
 */
export async function disableTenant(tenantId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tenants')
    .update({ enabled: false })
    .eq('id', tenantId)

  if (error) {
    console.error('Error disabling tenant:', error)
    return false
  }

  return true
}

/**
 * Verify custom domain DNS configuration
 * Returns true if DNS is correctly configured
 */
export async function verifyCustomDomain(domain: string): Promise<{
  valid: boolean
  records?: {
    type: string
    value: string
    expected: string
  }[]
}> {
  // TODO: Implement DNS verification
  // This would check if the domain has:
  // - A record pointing to the app's IP
  // - CNAME record pointing to the app's domain
  // For now, return placeholder

  return {
    valid: false,
    records: [
      {
        type: 'CNAME',
        value: 'Not configured',
        expected: process.env.NEXT_PUBLIC_APP_DOMAIN || 'vellopad.com',
      },
    ],
  }
}

/**
 * Get tenant from request headers
 * Used in middleware and server components
 */
export async function getTenantFromRequest(headers: Headers): Promise<TenantContext> {
  const hostname = headers.get('host') || ''
  return resolveTenant(hostname)
}

/**
 * Validate tenant slug format
 */
export function isValidSlug(slug: string): boolean {
  // Only lowercase alphanumeric and hyphens, 3-32 chars
  const slugRegex = /^[a-z0-9-]{3,32}$/
  return slugRegex.test(slug)
}

/**
 * Reserved slugs that cannot be used for tenants
 */
export const RESERVED_SLUGS = [
  'www',
  'api',
  'admin',
  'app',
  'auth',
  'dashboard',
  'settings',
  'account',
  'billing',
  'static',
  'assets',
  'cdn',
  'mail',
  'email',
  'smtp',
  'ftp',
  'support',
  'help',
  'blog',
  'docs',
  'status',
]

/**
 * Check if slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase())
}
