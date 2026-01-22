/**
 * Prodigi Webhook Handler
 * Handle order status updates from Prodigi
 *
 * @see PB-015: Print Order Webhooks
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ProdigiOrder } from '@/lib/providers/prodigi/types'

/**
 * Prodigi webhook event types
 */
export type ProdigiWebhookEvent =
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
 * Webhook payload structure
 */
interface ProdigiWebhookPayload {
  event: ProdigiWebhookEvent
  timestamp: string
  data: {
    order?: ProdigiOrder
    orderId?: string
    shipmentId?: string
  }
}

/**
 * Process order status update
 */
async function processOrderUpdate(
  event: ProdigiWebhookEvent,
  order: ProdigiOrder
): Promise<void> {
  console.log(`Processing webhook event: ${event}`, {
    orderId: order.id,
    merchantReference: order.merchantReference,
    status: order.status.stage
  })

  // TODO: Update order status in database
  // This would typically:
  // 1. Find order by merchantReference
  // 2. Update status
  // 3. Send notification email to customer
  // 4. Update tracking information

  switch (event) {
    case 'order.submitted':
      console.log('Order submitted to Prodigi:', order.id)
      break

    case 'order.processing':
      console.log('Order is being processed:', order.id)
      break

    case 'order.complete':
      console.log('Order completed:', order.id)
      break

    case 'order.cancelled':
      console.log('Order cancelled:', order.id)
      break

    case 'shipment.shipped':
      console.log('Order shipped:', order.id)
      if (order.shipments && order.shipments.length > 0) {
        const shipment = order.shipments[0]
        console.log('Tracking:', shipment.tracking)
      }
      break

    case 'shipment.delivered':
      console.log('Order delivered:', order.id)
      break

    default:
      console.log('Unhandled event:', event)
  }
}

/**
 * Verify webhook signature (implement based on Prodigi documentation)
 */
function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  // TODO: Implement signature verification
  // Prodigi may provide a signature header to verify authenticity
  // For now, we'll accept all webhooks in development

  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // In production, verify the signature
  const webhookSecret = process.env.PRODIGI_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('PRODIGI_WEBHOOK_SECRET not configured')
    return false
  }

  // TODO: Implement actual signature verification
  // This depends on Prodigi's webhook signing mechanism
  return true
}

/**
 * POST /api/webhooks/prodigi
 * Handle incoming webhooks from Prodigi
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    // Get signature from headers
    const signature = request.headers.get('x-prodigi-signature') || ''

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Parse payload
    const payload: ProdigiWebhookPayload = JSON.parse(rawBody)

    // Validate payload
    if (!payload.event || !payload.data) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    // Process the webhook
    if (payload.data.order) {
      await processOrderUpdate(payload.event, payload.data.order)
    }

    // Return success
    return NextResponse.json({
      success: true,
      event: payload.event,
      processedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Webhook processing error:', error)

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/prodigi
 * Webhook endpoint verification (if required by Prodigi)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Prodigi webhook endpoint is active'
  })
}
