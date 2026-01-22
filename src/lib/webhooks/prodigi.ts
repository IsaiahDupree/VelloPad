/**
 * Prodigi Webhook Utilities
 * Helper functions for processing Prodigi webhooks
 *
 * @see PB-015: Print Order Webhooks
 */

import type { ProdigiOrder, ProdigiOrderStatus } from '../providers/prodigi/types'

/**
 * Webhook event types
 */
export type WebhookEvent =
  | 'order.created'
  | 'order.updated'
  | 'order.submitted'
  | 'order.processing'
  | 'order.complete'
  | 'order.cancelled'
  | 'shipment.created'
  | 'shipment.shipped'
  | 'shipment.delivered'

/**
 * Order status update
 */
export interface OrderStatusUpdate {
  orderId: string
  merchantReference: string
  previousStatus?: ProdigiOrderStatus
  newStatus: ProdigiOrderStatus
  timestamp: Date
  trackingNumber?: string
  trackingUrl?: string
  issues?: string[]
}

/**
 * Extract status update from Prodigi order
 */
export function extractStatusUpdate(
  order: ProdigiOrder,
  previousStatus?: ProdigiOrderStatus
): OrderStatusUpdate {
  const update: OrderStatusUpdate = {
    orderId: order.id,
    merchantReference: order.merchantReference,
    previousStatus,
    newStatus: order.status.stage,
    timestamp: new Date(order.lastUpdated)
  }

  // Extract tracking information if available
  if (order.shipments && order.shipments.length > 0) {
    const shipment = order.shipments[0]
    if (shipment.tracking) {
      update.trackingNumber = shipment.tracking.number
      update.trackingUrl = shipment.tracking.url
    }
  }

  // Extract issues if any
  if (order.status.issues && order.status.issues.length > 0) {
    update.issues = order.status.issues.map(issue => issue.description)
  }

  return update
}

/**
 * Determine if status change requires customer notification
 */
export function shouldNotifyCustomer(event: WebhookEvent): boolean {
  const notifiableEvents: WebhookEvent[] = [
    'order.submitted',
    'order.processing',
    'order.complete',
    'order.cancelled',
    'shipment.shipped',
    'shipment.delivered'
  ]

  return notifiableEvents.includes(event)
}

/**
 * Get notification message for event
 */
export function getNotificationMessage(
  event: WebhookEvent,
  update: OrderStatusUpdate
): string {
  switch (event) {
    case 'order.submitted':
      return `Your order #${update.merchantReference} has been submitted for printing.`

    case 'order.processing':
      return `Your order #${update.merchantReference} is being processed.`

    case 'order.complete':
      return `Your order #${update.merchantReference} is complete!`

    case 'order.cancelled':
      return `Your order #${update.merchantReference} has been cancelled.`

    case 'shipment.shipped':
      if (update.trackingNumber) {
        return `Your order #${update.merchantReference} has shipped! Tracking: ${update.trackingNumber}`
      }
      return `Your order #${update.merchantReference} has shipped!`

    case 'shipment.delivered':
      return `Your order #${update.merchantReference} has been delivered!`

    default:
      return `Order #${update.merchantReference} status: ${update.newStatus}`
  }
}

/**
 * Validate webhook payload
 */
export function validateWebhookPayload(payload: any): boolean {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  if (!payload.event || typeof payload.event !== 'string') {
    return false
  }

  if (!payload.data || typeof payload.data !== 'object') {
    return false
  }

  return true
}

/**
 * Parse webhook event type
 */
export function parseWebhookEvent(event: string): WebhookEvent | null {
  const validEvents: WebhookEvent[] = [
    'order.created',
    'order.updated',
    'order.submitted',
    'order.processing',
    'order.complete',
    'order.cancelled',
    'shipment.created',
    'shipment.shipped',
    'shipment.delivered'
  ]

  if (validEvents.includes(event as WebhookEvent)) {
    return event as WebhookEvent
  }

  return null
}
