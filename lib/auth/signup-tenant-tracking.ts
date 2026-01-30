/**
 * MT-011: Customer Signup Tenant Tracking
 *
 * Tracks which tenant a user signed up through and their interests
 * for culture-matching segmentation.
 *
 * Features:
 * - Track signup_tenant_id in user metadata
 * - Track interests[] for personalization
 * - Helper functions for segmentation
 */

import { createClient } from '@/lib/supabase/server'
import { TenantContext } from '@/lib/tenant/resolver'

export interface SignupTenantMetadata {
  signup_tenant_id?: string
  interests?: string[]
  updated_at?: string
}

/**
 * Record the tenant that a user signed up through
 * Called during the signup flow (e.g., in auth callback)
 */
export async function recordSignupTenant(
  userId: string,
  tenantId: string,
  interests?: string[]
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc(
      'update_profile_signup_tenant',
      {
        user_id: userId,
        tenant_id: tenantId,
        interests: interests || null,
      }
    )

    if (error) {
      console.error('[MT-011] Failed to record signup tenant:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[MT-011] Error recording signup tenant:', err)
    return false
  }
}

/**
 * Get a user's signup tenant ID
 */
export async function getSignupTenant(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('[MT-011] Failed to get signup tenant:', error)
      return null
    }

    const metadata = data.metadata as Record<string, unknown>
    return (metadata?.signup_tenant_id as string) || null
  } catch (err) {
    console.error('[MT-011] Error getting signup tenant:', err)
    return null
  }
}

/**
 * Get a user's interests
 */
export async function getUserInterests(userId: string): Promise<string[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('[MT-011] Failed to get user interests:', error)
      return []
    }

    const metadata = data.metadata as Record<string, unknown>
    return (metadata?.interests as string[]) || []
  } catch (err) {
    console.error('[MT-011] Error getting user interests:', err)
    return []
  }
}

/**
 * Update user interests
 */
export async function updateUserInterests(
  userId: string,
  interests: string[]
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', userId)
      .single()

    const currentMetadata =
      (currentProfile?.metadata as Record<string, unknown>) || {}

    const { error } = await supabase
      .from('profiles')
      .update({
        metadata: {
          ...currentMetadata,
          interests,
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', userId)

    if (error) {
      console.error('[MT-011] Failed to update interests:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[MT-011] Error updating interests:', err)
    return false
  }
}

/**
 * Get all users who signed up through a specific tenant
 */
export async function getUsersBySignupTenant(
  tenantId: string
): Promise<Array<{
  user_id: string
  email: string
  interests: string[]
}>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc(
      'get_users_by_signup_tenant',
      { tenant_id: tenantId }
    )

    if (error) {
      console.error('[MT-011] Failed to get users by tenant:', error)
      return []
    }

    return (
      (data || []).map((row: Record<string, unknown>) => ({
        user_id: row.user_id as string,
        email: row.email as string,
        interests: (row.interests as string[]) || [],
      })) || []
    )
  } catch (err) {
    console.error('[MT-011] Error getting users by tenant:', err)
    return []
  }
}

/**
 * Get all users with a specific interest
 */
export async function getUsersByInterest(
  interest: string
): Promise<Array<{
  user_id: string
  email: string
  signup_tenant_id?: string
}>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_users_by_interest', {
      interest_name: interest,
    })

    if (error) {
      console.error('[MT-011] Failed to get users by interest:', error)
      return []
    }

    return (
      (data || []).map((row: Record<string, unknown>) => ({
        user_id: row.user_id as string,
        email: row.email as string,
        signup_tenant_id: (row.signup_tenant_id as string) || undefined,
      })) || []
    )
  } catch (err) {
    console.error('[MT-011] Error getting users by interest:', err)
    return []
  }
}

/**
 * Record signup tenant with tenant context
 * Convenience function to use during signup flow with TenantContext
 */
export async function recordSignupTenantFromContext(
  userId: string,
  tenantContext: TenantContext,
  interests?: string[]
): Promise<boolean> {
  if (!tenantContext.tenant) {
    console.warn('[MT-011] No tenant in context, skipping signup tracking')
    return false
  }

  return recordSignupTenant(userId, tenantContext.tenant.id, interests)
}
