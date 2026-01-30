/**
 * MT-005: Tenant Collections
 *
 * Manages curated product collections per tenant
 * Features:
 * - Create/read/update/delete collections
 * - Add/remove items from collections
 * - Reorder items
 * - Get featured collections for homepage
 */

import { createClient } from '@/lib/supabase/server'

export interface TenantCollection {
  id: string
  tenant_id: string
  name: string
  slug: string
  description?: string
  category?: string
  cover_image_url?: string
  featured_book_ids?: string[]
  featured_order_ids?: string[]
  display_order: number
  is_visible: boolean
  show_in_home: boolean
  show_in_sidebar: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CollectionItem {
  id: string
  collection_id: string
  book_id?: string
  order_id?: string
  position: number
  created_at: string
}

export interface CollectionItemWithDetails {
  position: number
  book_id?: string
  book_title?: string
  book_cover_url?: string
  order_id?: string
  order_user_email?: string
  order_total?: number
}

/**
 * Create a new collection for a tenant
 */
export async function createTenantCollection(params: {
  tenant_id: string
  name: string
  slug: string
  description?: string
  category?: string
  cover_image_url?: string
  display_order?: number
  is_visible?: boolean
  show_in_home?: boolean
  show_in_sidebar?: boolean
}): Promise<TenantCollection | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tenant_collections')
      .insert([
        {
          tenant_id: params.tenant_id,
          name: params.name,
          slug: params.slug,
          description: params.description || null,
          category: params.category || null,
          cover_image_url: params.cover_image_url || null,
          display_order: params.display_order || 0,
          is_visible: params.is_visible !== false,
          show_in_home: params.show_in_home || false,
          show_in_sidebar: params.show_in_sidebar || false,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[MT-005] Failed to create collection:', error)
      return null
    }

    return data as TenantCollection
  } catch (err) {
    console.error('[MT-005] Error creating collection:', err)
    return null
  }
}

/**
 * Get all collections for a tenant
 */
export async function getTenantCollections(
  tenantId: string,
  visibleOnly: boolean = true
): Promise<TenantCollection[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tenant_collections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_visible', visibleOnly ? true : undefined)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[MT-005] Failed to get collections:', error)
      return []
    }

    return (data as TenantCollection[]) || []
  } catch (err) {
    console.error('[MT-005] Error getting collections:', err)
    return []
  }
}

/**
 * Get a collection by ID
 */
export async function getTenantCollection(
  collectionId: string
): Promise<TenantCollection | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tenant_collections')
      .select('*')
      .eq('id', collectionId)
      .single()

    if (error) {
      console.error('[MT-005] Failed to get collection:', error)
      return null
    }

    return data as TenantCollection
  } catch (err) {
    console.error('[MT-005] Error getting collection:', err)
    return null
  }
}

/**
 * Get a collection by slug
 */
export async function getTenantCollectionBySlug(
  tenantId: string,
  slug: string
): Promise<TenantCollection | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tenant_collections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('[MT-005] Failed to get collection by slug:', error)
      return null
    }

    return data as TenantCollection
  } catch (err) {
    console.error('[MT-005] Error getting collection by slug:', err)
    return null
  }
}

/**
 * Update a collection
 */
export async function updateTenantCollection(
  collectionId: string,
  updates: Partial<Omit<TenantCollection, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<TenantCollection | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tenant_collections')
      .update(updates)
      .eq('id', collectionId)
      .select()
      .single()

    if (error) {
      console.error('[MT-005] Failed to update collection:', error)
      return null
    }

    return data as TenantCollection
  } catch (err) {
    console.error('[MT-005] Error updating collection:', err)
    return null
  }
}

/**
 * Delete a collection
 */
export async function deleteTenantCollection(
  collectionId: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('tenant_collections')
      .delete()
      .eq('id', collectionId)

    if (error) {
      console.error('[MT-005] Failed to delete collection:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[MT-005] Error deleting collection:', err)
    return false
  }
}

/**
 * Get featured collections for a tenant's homepage
 */
export async function getFeaturedCollections(
  tenantId: string
): Promise<TenantCollection[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tenant_collections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_visible', true)
      .eq('show_in_home', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[MT-005] Failed to get featured collections:', error)
      return []
    }

    return (data as TenantCollection[]) || []
  } catch (err) {
    console.error('[MT-005] Error getting featured collections:', err)
    return []
  }
}

/**
 * Add an item (book or order) to a collection
 */
export async function addCollectionItem(params: {
  collection_id: string
  book_id?: string
  order_id?: string
}): Promise<CollectionItem | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tenant_collection_items')
      .insert([
        {
          collection_id: params.collection_id,
          book_id: params.book_id || null,
          order_id: params.order_id || null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[MT-005] Failed to add collection item:', error)
      return null
    }

    return data as CollectionItem
  } catch (err) {
    console.error('[MT-005] Error adding collection item:', err)
    return null
  }
}

/**
 * Remove an item from a collection
 */
export async function removeCollectionItem(itemId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('tenant_collection_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('[MT-005] Failed to remove collection item:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[MT-005] Error removing collection item:', err)
    return false
  }
}

/**
 * Get all items in a collection
 */
export async function getCollectionItems(
  collectionId: string
): Promise<CollectionItemWithDetails[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tenant_collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('position', { ascending: true })

    if (error) {
      console.error('[MT-005] Failed to get collection items:', error)
      return []
    }

    // Fetch book/order details
    const items = (data || []) as CollectionItem[]
    const enrichedItems: CollectionItemWithDetails[] = []

    for (const item of items) {
      if (item.book_id) {
        const book = await supabase
          .from('books')
          .select('id,title,cover_url')
          .eq('id', item.book_id)
          .single()

        enrichedItems.push({
          position: item.position,
          book_id: item.book_id,
          book_title: book.data?.title,
          book_cover_url: book.data?.cover_url,
        })
      } else if (item.order_id) {
        const order = await supabase
          .from('orders')
          .select('id,user_id,total_price,profiles(email)')
          .eq('id', item.order_id)
          .single()

        enrichedItems.push({
          position: item.position,
          order_id: item.order_id,
          order_user_email: (order.data?.profiles as any)?.email,
          order_total: order.data?.total_price,
        })
      }
    }

    return enrichedItems
  } catch (err) {
    console.error('[MT-005] Error getting collection items:', err)
    return []
  }
}

/**
 * Reorder items in a collection
 */
export async function reorderCollectionItems(
  collectionId: string,
  itemIds: string[]
): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Update each item with its new position
    for (let i = 0; i < itemIds.length; i++) {
      const { error } = await supabase
        .from('tenant_collection_items')
        .update({ position: i + 1 })
        .eq('id', itemIds[i])

      if (error) {
        console.error('[MT-005] Failed to reorder item:', error)
        return false
      }
    }

    return true
  } catch (err) {
    console.error('[MT-005] Error reordering collection items:', err)
    return false
  }
}

/**
 * Update collection cover image
 */
export async function updateCollectionCover(
  collectionId: string,
  imageUrl: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('tenant_collections')
      .update({ cover_image_url: imageUrl })
      .eq('id', collectionId)

    if (error) {
      console.error('[MT-005] Failed to update collection cover:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[MT-005] Error updating collection cover:', err)
    return false
  }
}

/**
 * Get collections containing a specific book
 */
export async function getCollectionsContainingBook(
  bookId: string
): Promise<TenantCollection[]> {
  try {
    const supabase = await createClient()

    const { data: items } = await supabase
      .from('tenant_collection_items')
      .select('collection_id')
      .eq('book_id', bookId)

    if (!items || items.length === 0) return []

    const collectionIds = items.map((item) => item.collection_id)

    const { data: collections, error } = await supabase
      .from('tenant_collections')
      .select('*')
      .in('id', collectionIds)

    if (error) {
      console.error('[MT-005] Failed to get collections containing book:', error)
      return []
    }

    return (collections as TenantCollection[]) || []
  } catch (err) {
    console.error('[MT-005] Error getting collections containing book:', err)
    return []
  }
}
