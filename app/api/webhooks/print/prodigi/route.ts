import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * Prodigi Webhook Handler
 * Feature: BS-603
 *
 * Handles webhook notifications from Prodigi for order status updates
 *
 * Webhook Events:
 * - order.created
 * - order.shipment.dispatched
 * - order.shipment.delivered
 * - order.issue.raised
 * - order.issue.resolved
 * - order.cancelled
 */

interface ProdigiWebhookPayload {
  event: string;
  timestamp: string;
  orderId: string;
  order?: {
    id: string;
    created: string;
    status: {
      stage: string;
      issues: any[];
      details?: string;
    };
    shipments?: Array<{
      id: string;
      carrier: {
        name: string;
        service: string;
      };
      tracking?: {
        url: string;
        number: string;
      };
      dispatched?: string;
      fulfilled?: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const signature = headersList.get('x-prodigi-signature');
    const body = await request.text();

    // Verify webhook signature
    const isValid = await verifyProdigiSignature(body, signature);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload: ProdigiWebhookPayload = JSON.parse(body);
    console.log('Received Prodigi webhook:', payload.event, payload.orderId);

    // Process the webhook
    const result = await processProdigiWebhook(payload);

    return NextResponse.json({
      received: true,
      processed: result
    });
  } catch (error) {
    console.error('Error processing Prodigi webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function verifyProdigiSignature(body: string, signature: string | null): Promise<boolean> {
  // In production, verify using HMAC-SHA256 with webhook secret
  // For now, accept all webhooks (security risk - implement before production)

  const webhookSecret = process.env.PRODIGI_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('PRODIGI_WEBHOOK_SECRET not set - skipping signature verification');
    return true; // Allow in development
  }

  if (!signature) {
    return false;
  }

  // TODO: Implement HMAC verification
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', webhookSecret)
  //   .update(body)
  //   .digest('hex');
  // return signature === expectedSignature;

  return true;
}

async function processProdigiWebhook(payload: ProdigiWebhookPayload): Promise<boolean> {
  const supabase = await createClient();

  // Find the order by provider order ID
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('provider_order_id', payload.orderId)
    .single();

  if (orderError || !order) {
    console.error('Order not found:', payload.orderId);
    return false;
  }

  // Map Prodigi event to our order status
  const statusUpdate = mapProdigiEvent(payload);

  // Update order status
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: statusUpdate.status,
      provider_status: payload.order?.status.stage || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  if (updateError) {
    console.error('Error updating order:', updateError);
    return false;
  }

  // Create order status update record
  const { error: historyError } = await supabase
    .from('order_status_updates')
    .insert({
      order_id: order.id,
      status: statusUpdate.status,
      message: statusUpdate.message,
      provider_data: payload,
      created_at: new Date().toISOString(),
    });

  if (historyError) {
    console.error('Error creating status update:', historyError);
  }

  // Handle shipment tracking info
  if (payload.order?.shipments && payload.order.shipments.length > 0) {
    const shipment = payload.order.shipments[0];

    if (shipment.tracking) {
      await supabase
        .from('shipments')
        .upsert({
          order_id: order.id,
          carrier_name: shipment.carrier.name,
          tracking_number: shipment.tracking.number,
          tracking_url: shipment.tracking.url,
          shipped_at: shipment.dispatched || null,
          delivered_at: shipment.fulfilled || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'order_id',
        });
    }
  }

  // TODO: Send email notification to customer
  // await sendOrderStatusEmail(order, statusUpdate);

  return true;
}

function mapProdigiEvent(payload: ProdigiWebhookPayload): { status: string; message: string } {
  const stage = payload.order?.status.stage;

  switch (payload.event) {
    case 'order.created':
      return {
        status: 'processing',
        message: 'Order received and being processed'
      };

    case 'order.shipment.dispatched':
      return {
        status: 'shipped',
        message: 'Order has been shipped'
      };

    case 'order.shipment.delivered':
      return {
        status: 'delivered',
        message: 'Order has been delivered'
      };

    case 'order.issue.raised':
      return {
        status: 'issue',
        message: payload.order?.status.details || 'An issue has been reported with your order'
      };

    case 'order.issue.resolved':
      return {
        status: 'processing',
        message: 'Issue has been resolved, order is being processed'
      };

    case 'order.cancelled':
      return {
        status: 'cancelled',
        message: 'Order has been cancelled'
      };

    default:
      // Fallback based on stage
      if (stage === 'InProduction') {
        return {
          status: 'processing',
          message: 'Order is in production'
        };
      } else if (stage === 'Complete') {
        return {
          status: 'completed',
          message: 'Order is complete'
        };
      }

      return {
        status: 'processing',
        message: `Order status: ${stage || payload.event}`
      };
  }
}

// Disable body parsing to get raw body for signature verification
export const runtime = 'edge';
