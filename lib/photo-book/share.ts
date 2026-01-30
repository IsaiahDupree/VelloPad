/**
 * PB-028: Shareable Preview Links
 *
 * Generate shareable links for photo book previews
 * Features:
 * - Generate unique share tokens
 * - Track shares and previews
 * - Set expiration dates
 * - Enable/disable sharing
 */

import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

export interface ShareablePreview {
  id: string
  project_id: string
  share_token: string
  preview_url: string
  created_by: string
  is_active: boolean
  expires_at?: string
  view_count: number
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
}

/**
 * Generate a shareable preview link
 */
export async function createShareablePreview(
  projectId: string,
  expiresIn?: number // seconds
): Promise<ShareablePreview | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('[PB-028] User not authenticated')
      return null
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('photo_book_projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single()

    if (!project || project.user_id !== user.id) {
      console.error('[PB-028] Project not found or unauthorized')
      return null
    }

    const shareToken = nanoid(16)
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : undefined

    const { data, error } = await supabase
      .from('photo_book_shares')
      .insert({
        project_id: projectId,
        share_token: shareToken,
        created_by: user.id,
        is_active: true,
        expires_at: expiresAt,
        view_count: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('[PB-028] Error creating share:', error)
      return null
    }

    const shareLink = `/photo-book/share/${shareToken}`
    return {
      ...data,
      preview_url: shareLink,
    } as ShareablePreview
  } catch (err) {
    console.error('[PB-028] Error creating shareable preview:', err)
    return null
  }
}

/**
 * Get shareable preview by token (public access)
 */
export async function getShareablePreview(
  shareToken: string
): Promise<ShareablePreview | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('photo_book_shares')
      .select('*')
      .eq('share_token', shareToken)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      console.error('[PB-028] Share not found:', error)
      return null
    }

    // Check expiration
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at)
      if (expiresAt < new Date()) {
        console.warn('[PB-028] Share link has expired')
        return null
      }
    }

    // Increment view count
    try {
      await supabase
        .from('photo_book_shares')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id)
    } catch (err) {
      console.error('[PB-028] Error incrementing view count:', err)
    }

    return {
      ...data,
      preview_url: `/photo-book/share/${shareToken}`,
    } as ShareablePreview
  } catch (err) {
    console.error('[PB-028] Error getting shareable preview:', err)
    return null
  }
}

/**
 * Get all shareable previews for a project
 */
export async function getProjectShares(projectId: string): Promise<ShareablePreview[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('photo_book_shares')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[PB-028] Error getting project shares:', error)
      return []
    }

    return (data || []).map((share) => ({
      ...share,
      preview_url: `/photo-book/share/${share.share_token}`,
    })) as ShareablePreview[]
  } catch (err) {
    console.error('[PB-028] Error getting project shares:', err)
    return []
  }
}

/**
 * Disable a shareable preview
 */
export async function disableShareablePreview(shareId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('photo_book_shares')
      .update({ is_active: false })
      .eq('id', shareId)

    if (error) {
      console.error('[PB-028] Error disabling share:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[PB-028] Error disabling share:', err)
    return false
  }
}

/**
 * Delete a shareable preview
 */
export async function deleteShareablePreview(shareId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('photo_book_shares')
      .delete()
      .eq('id', shareId)

    if (error) {
      console.error('[PB-028] Error deleting share:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[PB-028] Error deleting share:', err)
    return false
  }
}

/**
 * Update share metadata
 */
export async function updateShareablePreview(
  shareId: string,
  updates: Partial<Omit<ShareablePreview, 'id' | 'created_at' | 'updated_at'>>
): Promise<ShareablePreview | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('photo_book_shares')
      .update(updates)
      .eq('id', shareId)
      .select()
      .single()

    if (error) {
      console.error('[PB-028] Error updating share:', error)
      return null
    }

    return {
      ...data,
      preview_url: `/photo-book/share/${data.share_token}`,
    } as ShareablePreview
  } catch (err) {
    console.error('[PB-028] Error updating share:', err)
    return null
  }
}

/**
 * Get share statistics
 */
export async function getShareStatistics(projectId: string): Promise<{
  total_shares: number
  active_shares: number
  total_views: number
  most_viewed: ShareablePreview | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('photo_book_shares')
      .select('*')
      .eq('project_id', projectId)

    if (error) {
      console.error('[PB-028] Error getting statistics:', error)
      return {
        total_shares: 0,
        active_shares: 0,
        total_views: 0,
        most_viewed: null,
      }
    }

    const shares = data || []
    const activeShares = shares.filter((s) => s.is_active)
    const totalViews = shares.reduce((sum, s) => sum + (s.view_count || 0), 0)
    const mostViewed = shares.reduce((max, s) =>
      (s.view_count || 0) > (max?.view_count || 0) ? s : max
    )

    return {
      total_shares: shares.length,
      active_shares: activeShares.length,
      total_views: totalViews,
      most_viewed: mostViewed ? ({
        ...mostViewed,
        preview_url: `/photo-book/share/${mostViewed.share_token}`,
      } as ShareablePreview) : null,
    }
  } catch (err) {
    console.error('[PB-028] Error getting statistics:', err)
    return {
      total_shares: 0,
      active_shares: 0,
      total_views: 0,
      most_viewed: null,
    }
  }
}
