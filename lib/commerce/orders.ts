/**
 * Order Management - BS-503
 *
 * Functions for managing orders and tracking status.
 */

import { createClient } from '@/lib/supabase/server'

export interface Order {
  id: string
  orderNumber: string
  workspaceId: string
  userId: string
  bookId: string
  provider: string
  status: OrderStatus
  quantity: number
  productPrice: number
  shippingPrice: number
  taxAmount: number
  totalAmount: number
  currency: string
  shippingMethod: string
  shippingAddress: ShippingAddress
  providerOrderId?: string
  trackingNumber?: string
  trackingUrl?: string
  paidAt?: Date
  submittedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'payment_failed'
  | 'processing'
  | 'printing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'issue'

export interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface OrderStatusUpdate {
  id: string
  orderId: string
  status: OrderStatus
  message?: string
  metadata?: Record<string, any>
  createdAt: Date
}

export interface Shipment {
  id: string
  orderId: string
  carrier: string
  trackingNumber: string
  trackingUrl?: string
  shippedAt: Date
  estimatedDelivery?: Date
  deliveredAt?: Date
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<Order | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*, books(title, trim_size, binding)')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    return null
  }

  return transformOrder(data)
}

/**
 * Get orders for a workspace
 */
export async function getWorkspaceOrders(
  workspaceId: string,
  limit: number = 50
): Promise<Order[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*, books(title, trim_size, binding)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data.map(transformOrder)
}

/**
 * Get orders for a specific book
 */
export async function getBookOrders(bookId: string): Promise<Order[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*, books(title)')
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map(transformOrder)
}

/**
 * Get order status history
 */
export async function getOrderStatusHistory(
  orderId: string
): Promise<OrderStatusUpdate[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('order_status_updates')
    .select()
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map((update) => ({
    id: update.id,
    orderId: update.order_id,
    status: update.status,
    message: update.message,
    metadata: update.metadata,
    createdAt: new Date(update.created_at),
  }))
}

/**
 * Get shipments for an order
 */
export async function getOrderShipments(orderId: string): Promise<Shipment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('shipments')
    .select()
    .eq('order_id', orderId)
    .order('shipped_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map((shipment) => ({
    id: shipment.id,
    orderId: shipment.order_id,
    carrier: shipment.carrier,
    trackingNumber: shipment.tracking_number,
    trackingUrl: shipment.tracking_url,
    shippedAt: new Date(shipment.shipped_at),
    estimatedDelivery: shipment.estimated_delivery
      ? new Date(shipment.estimated_delivery)
      : undefined,
    deliveredAt: shipment.delivered_at
      ? new Date(shipment.delivered_at)
      : undefined,
  }))
}

/**
 * Cancel an order (if possible)
 */
export async function cancelOrder(orderId: string): Promise<boolean> {
  const supabase = await createClient()

  // Only allow cancellation of paid/processing orders
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single()

  if (!order) {
    throw new Error('Order not found')
  }

  if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
    throw new Error('Cannot cancel order in this status')
  }

  // Update order status
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)

  if (error) {
    throw new Error(`Failed to cancel order: ${error.message}`)
  }

  // Add status update
  await supabase.from('order_status_updates').insert({
    order_id: orderId,
    status: 'cancelled',
    message: 'Order cancelled by user',
  })

  return true
}

/**
 * Transform database row to Order type
 */
function transformOrder(data: any): Order {
  return {
    id: data.id,
    orderNumber: data.order_number,
    workspaceId: data.workspace_id,
    userId: data.user_id,
    bookId: data.book_id,
    provider: data.provider,
    status: data.status,
    quantity: data.quantity,
    productPrice: data.product_price,
    shippingPrice: data.shipping_price,
    taxAmount: data.tax_amount,
    totalAmount: data.total_amount,
    currency: data.currency,
    shippingMethod: data.shipping_method,
    shippingAddress: data.shipping_address,
    providerOrderId: data.provider_order_id,
    trackingNumber: data.tracking_number,
    trackingUrl: data.tracking_url,
    paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
    submittedAt: data.submitted_at ? new Date(data.submitted_at) : undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

/**
 * Get status display name
 */
export function getStatusDisplayName(status: OrderStatus): string {
  const names: Record<OrderStatus, string> = {
    pending_payment: 'Pending Payment',
    paid: 'Payment Received',
    payment_failed: 'Payment Failed',
    processing: 'Processing',
    printing: 'Printing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    issue: 'Issue',
  }
  return names[status] || status
}

/**
 * Get status color for badges
 */
export function getStatusColor(
  status: OrderStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const colors: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending_payment: 'outline',
    paid: 'default',
    payment_failed: 'destructive',
    processing: 'secondary',
    printing: 'secondary',
    shipped: 'default',
    delivered: 'default',
    cancelled: 'destructive',
    issue: 'destructive',
  }
  return colors[status] || 'outline'
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}
