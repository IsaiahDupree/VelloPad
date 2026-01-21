/**
 * Reorder Flow - BS-504
 *
 * Functions for reordering from saved renditions without regenerating PDFs.
 */

import { createClient } from '@/lib/supabase/server'

export interface ReorderRequest {
  orderId: string
  quantity?: number // Optional: change quantity
  shippingAddress?: ShippingAddress // Optional: change address
  shippingMethod?: string // Optional: change shipping method
}

export interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface ReorderResult {
  success: boolean
  renditionId?: string
  quoteId?: string
  error?: string
}

/**
 * Check if an order can be reordered
 */
export async function canReorder(orderId: string): Promise<{
  canReorder: boolean
  reason?: string
  renditionId?: string
}> {
  const supabase = await createClient()

  // Get the order with rendition info
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, rendition_id, book_id, status, renditions(id, status, interior_pdf_url, cover_pdf_url)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return { canReorder: false, reason: 'Order not found' }
  }

  // Check if order has a rendition
  if (!order.rendition_id) {
    return { canReorder: false, reason: 'Order has no associated rendition' }
  }

  // Check if rendition is accessible
  const rendition = Array.isArray(order.renditions) ? order.renditions[0] : order.renditions
  if (!rendition) {
    return { canReorder: false, reason: 'Rendition not found' }
  }

  // Check if rendition has PDFs
  if (!rendition.interior_pdf_url || !rendition.cover_pdf_url) {
    return { canReorder: false, reason: 'Rendition PDFs not available. Please regenerate.' }
  }

  // Check rendition status
  if (rendition.status !== 'succeeded') {
    return { canReorder: false, reason: 'Rendition is not ready. Please wait for it to complete.' }
  }

  return {
    canReorder: true,
    renditionId: order.rendition_id,
  }
}

/**
 * Get reorder details from a previous order
 */
export async function getReorderDetails(orderId: string): Promise<{
  bookId: string
  renditionId: string
  originalOrder: any
  book: any
  rendition: any
} | null> {
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      books(id, title, trim_size, binding, page_count),
      renditions(id, status, interior_pdf_url, cover_pdf_url, spec)
    `)
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return null
  }

  const book = Array.isArray(order.books) ? order.books[0] : order.books
  const rendition = Array.isArray(order.renditions) ? order.renditions[0] : order.renditions

  return {
    bookId: order.book_id,
    renditionId: order.rendition_id,
    originalOrder: order,
    book,
    rendition,
  }
}

/**
 * Create a quote for reordering using saved rendition
 * This skips PDF generation and uses the existing PDFs
 */
export async function createReorderQuote(
  orderId: string,
  request: Partial<ReorderRequest>
): Promise<{
  success: boolean
  quoteId?: string
  error?: string
}> {
  const supabase = await createClient()

  // Check if order can be reordered
  const reorderCheck = await canReorder(orderId)
  if (!reorderCheck.canReorder) {
    return { success: false, error: reorderCheck.reason }
  }

  // Get reorder details
  const details = await getReorderDetails(orderId)
  if (!details) {
    return { success: false, error: 'Failed to get reorder details' }
  }

  const { originalOrder, book, rendition } = details

  // Use original values or override with request values
  const quantity = request.quantity || 1
  const shippingAddress = request.shippingAddress || {
    name: originalOrder.customer_name,
    line1: originalOrder.shipping_address_line1,
    line2: originalOrder.shipping_address_line2,
    city: originalOrder.shipping_city,
    state: originalOrder.shipping_state,
    postalCode: originalOrder.shipping_postal_code,
    country: originalOrder.shipping_country_code,
  }
  const shippingMethod = request.shippingMethod || originalOrder.shipping_method

  // Create a new quote using the existing rendition
  // Note: In a real implementation, this would call the print orchestrator
  // For now, we'll create a quote record directly

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'User not authenticated' }
  }

  // Create quote record
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      workspace_id: originalOrder.workspace_id,
      user_id: user.id,
      book_id: details.bookId,
      provider: originalOrder.provider,
      shipping_country_code: shippingAddress.country,
      shipping_postal_code: shippingAddress.postalCode,
      quantity,
      shipping_method: shippingMethod,
      product_price_cents: originalOrder.subtotal_cents * quantity,
      shipping_price_cents: originalOrder.shipping_cents,
      tax_cents: Math.round(originalOrder.tax_cents * quantity / (originalOrder.subtotal_cents > 0 ? 1 : 1)),
      total_price_cents: (originalOrder.subtotal_cents * quantity) + originalOrder.shipping_cents + originalOrder.tax_cents,
      currency_code: originalOrder.currency_code,
      is_reorder: true,
      original_order_id: orderId,
      metadata: {
        isReorder: true,
        originalOrderId: orderId,
        renditionId: reorderCheck.renditionId,
      },
    })
    .select()
    .single()

  if (quoteError || !quote) {
    return { success: false, error: 'Failed to create reorder quote' }
  }

  return {
    success: true,
    quoteId: quote.id,
  }
}

/**
 * Get reorder history for a book
 * Returns all orders that used the same rendition
 */
export async function getReorderHistory(renditionId: string): Promise<any[]> {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, status, total_cents, currency_code, created_at')
    .eq('rendition_id', renditionId)
    .order('created_at', { ascending: false })

  if (error || !orders) {
    return []
  }

  return orders
}

/**
 * Get reorder statistics for a user
 */
export async function getReorderStats(userId: string): Promise<{
  totalReorders: number
  reorderRate: number
  totalRevenue: number
}> {
  const supabase = await createClient()

  // Get all orders for user
  const { data: allOrders } = await supabase
    .from('orders')
    .select('id, total_cents, metadata')
    .eq('user_id', userId)

  if (!allOrders || allOrders.length === 0) {
    return { totalReorders: 0, reorderRate: 0, totalRevenue: 0 }
  }

  // Count reorders (orders with metadata.isReorder = true)
  const reorders = allOrders.filter(
    (order) => order.metadata && (order.metadata as any).isReorder === true
  )

  const totalReorders = reorders.length
  const reorderRate = totalReorders / allOrders.length
  const totalRevenue = reorders.reduce((sum, order) => sum + order.total_cents, 0) / 100

  return {
    totalReorders,
    reorderRate,
    totalRevenue,
  }
}
