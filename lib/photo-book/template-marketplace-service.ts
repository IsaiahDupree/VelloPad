/**
 * Template Marketplace Service
 * Business logic for browsing and purchasing photo book templates
 * @see PB-035: Template Marketplace
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Template category
 */
export type TemplateCategory = 'classic' | 'collage' | 'magazine' | 'minimalist' | 'seasonal' | 'all'

/**
 * Template type (free vs premium)
 */
export type TemplateType = 'free' | 'premium'

/**
 * Sort options
 */
export type TemplateSortOption = 'popular' | 'newest' | 'price-low' | 'price-high' | 'rating'

/**
 * Marketplace template
 */
export interface MarketplaceTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  type: TemplateType
  price: number
  currency: string
  thumbnail: string
  previewImages: string[]
  rating: number
  reviewCount: number
  downloadCount: number
  isPurchased?: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Template review
 */
export interface TemplateReview {
  id: string
  templateId: string
  userId: string
  userName: string
  rating: number
  comment: string
  createdAt: Date
}

/**
 * Get all marketplace templates
 */
export async function getMarketplaceTemplates(
  category: TemplateCategory = 'all',
  sortBy: TemplateSortOption = 'popular',
  searchQuery?: string
): Promise<MarketplaceTemplate[]> {
  const supabase = await createClient()

  let query = supabase
    .from('photo_book_templates')
    .select('*')
    .eq('is_marketplace', true)

  // Filter by category
  if (category !== 'all') {
    query = query.eq('category', category)
  }

  // Filter by search query
  if (searchQuery) {
    query = query.ilike('name', `%${searchQuery}%`)
  }

  // Apply sorting
  switch (sortBy) {
    case 'popular':
      query = query.order('download_count', { ascending: false })
      break
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    case 'price-low':
      query = query.order('price', { ascending: true })
      break
    case 'price-high':
      query = query.order('price', { ascending: false })
      break
    case 'rating':
      query = query.order('rating', { ascending: false })
      break
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching marketplace templates:', error)
    return []
  }

  return data.map(template => ({
    id: template.id,
    name: template.name,
    description: template.description ?? '',
    category: template.category,
    type: template.price > 0 ? 'premium' : 'free',
    price: template.price ?? 0,
    currency: template.currency ?? 'USD',
    thumbnail: template.thumbnail ?? '',
    previewImages: template.preview_images ?? [],
    rating: template.rating ?? 0,
    reviewCount: template.review_count ?? 0,
    downloadCount: template.download_count ?? 0,
    createdAt: new Date(template.created_at),
    updatedAt: new Date(template.updated_at)
  }))
}

/**
 * Get template by ID
 */
export async function getTemplateById(
  templateId: string,
  userId?: string
): Promise<MarketplaceTemplate | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('photo_book_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error || !data) {
    return null
  }

  // Check if user has purchased this template
  let isPurchased = data.price === 0 // Free templates are always "purchased"

  if (userId && data.price > 0) {
    const { data: purchase } = await supabase
      .from('template_purchases')
      .select('id')
      .eq('template_id', templateId)
      .eq('user_id', userId)
      .single()

    isPurchased = !!purchase
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? '',
    category: data.category,
    type: data.price > 0 ? 'premium' : 'free',
    price: data.price ?? 0,
    currency: data.currency ?? 'USD',
    thumbnail: data.thumbnail ?? '',
    previewImages: data.preview_images ?? [],
    rating: data.rating ?? 0,
    reviewCount: data.review_count ?? 0,
    downloadCount: data.download_count ?? 0,
    isPurchased,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  }
}

/**
 * Get template reviews
 */
export async function getTemplateReviews(
  templateId: string,
  limit: number = 10
): Promise<TemplateReview[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('template_reviews')
    .select('*, profiles(display_name)')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data.map(review => ({
    id: review.id,
    templateId: review.template_id,
    userId: review.user_id,
    userName: review.profiles?.display_name ?? 'Anonymous',
    rating: review.rating,
    comment: review.comment ?? '',
    createdAt: new Date(review.created_at)
  }))
}

/**
 * Purchase template
 */
export async function purchaseTemplate(
  templateId: string,
  userId: string,
  paymentIntentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get template
  const template = await getTemplateById(templateId, userId)

  if (!template) {
    return { success: false, error: 'Template not found' }
  }

  if (template.isPurchased) {
    return { success: false, error: 'Template already purchased' }
  }

  // Record purchase
  const { error } = await supabase
    .from('template_purchases')
    .insert({
      template_id: templateId,
      user_id: userId,
      payment_intent_id: paymentIntentId,
      price_paid: template.price,
      currency: template.currency
    })

  if (error) {
    console.error('Error recording template purchase:', error)
    return { success: false, error: 'Failed to record purchase' }
  }

  // Increment download count
  await supabase.rpc('increment_template_downloads', { template_id: templateId })

  return { success: true }
}

/**
 * Use free template
 */
export async function useFreeTemplate(
  templateId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verify template is free
  const template = await getTemplateById(templateId, userId)

  if (!template) {
    return { success: false, error: 'Template not found' }
  }

  if (template.type !== 'free') {
    return { success: false, error: 'Template is not free' }
  }

  // Record usage
  const { error } = await supabase
    .from('template_usage')
    .insert({
      template_id: templateId,
      user_id: userId
    })

  if (error) {
    console.error('Error recording template usage:', error)
  }

  // Increment download count
  await supabase.rpc('increment_template_downloads', { template_id: templateId })

  return { success: true }
}

/**
 * Submit template review
 */
export async function submitTemplateReview(
  templateId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verify user has purchased/used the template
  const { data: purchase } = await supabase
    .from('template_purchases')
    .select('id')
    .eq('template_id', templateId)
    .eq('user_id', userId)
    .single()

  const { data: usage } = await supabase
    .from('template_usage')
    .select('id')
    .eq('template_id', templateId)
    .eq('user_id', userId)
    .single()

  if (!purchase && !usage) {
    return { success: false, error: 'Must purchase or use template before reviewing' }
  }

  // Submit review
  const { error } = await supabase
    .from('template_reviews')
    .upsert({
      template_id: templateId,
      user_id: userId,
      rating,
      comment
    }, {
      onConflict: 'template_id,user_id'
    })

  if (error) {
    console.error('Error submitting review:', error)
    return { success: false, error: 'Failed to submit review' }
  }

  // Update template average rating
  await supabase.rpc('update_template_rating', { template_id: templateId })

  return { success: true }
}
