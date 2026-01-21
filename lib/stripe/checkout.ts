/**
 * Stripe Checkout Integration - BS-502
 *
 * Handles Stripe checkout session creation and order processing.
 */

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

export interface CheckoutSessionInput {
  quoteId: string
  userId: string
  successUrl: string
  cancelUrl: string
}

export interface CheckoutSession {
  sessionId: string
  url: string
  orderId: string
}

/**
 * Create a Stripe checkout session for a quote
 */
export async function createCheckoutSession(
  input: CheckoutSessionInput
): Promise<CheckoutSession> {
  const supabase = await createClient()

  // Get quote details
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*, books(title, workspace_id)')
    .eq('id', input.quoteId)
    .single()

  if (quoteError || !quote) {
    throw new Error('Quote not found')
  }

  // Verify quote hasn't expired
  if (new Date(quote.expires_at) < new Date()) {
    throw new Error('Quote has expired. Please request a new quote.')
  }

  // Verify user has access to the workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', quote.books.workspace_id)
    .eq('user_id', input.userId)
    .single()

  if (!membership) {
    throw new Error('Access denied')
  }

  // Create order record
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      workspace_id: quote.books.workspace_id,
      user_id: input.userId,
      book_id: quote.book_id,
      provider: quote.provider,
      status: 'pending_payment',
      quantity: quote.quantity,
      product_price: quote.product_price,
      shipping_price: quote.shipping_price,
      tax_amount: quote.tax_amount,
      total_amount: quote.total_price,
      currency: quote.currency,
      shipping_method: quote.shipping_method,
      shipping_address: quote.shipping_address,
      print_spec: quote.print_spec,
      quote_id: quote.id,
      metadata: {
        stripe_created: true,
        product_sku: quote.product_sku,
      },
    })
    .select()
    .single()

  if (orderError || !order) {
    throw new Error(`Failed to create order: ${orderError?.message}`)
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: quote.currency.toLowerCase(),
          product_data: {
            name: `${quote.books.title} (${quote.quantity} ${quote.quantity === 1 ? 'copy' : 'copies'})`,
            description: `Printed by ${quote.provider}`,
            metadata: {
              book_id: quote.book_id,
              quote_id: quote.id,
              order_id: order.id,
              provider: quote.provider,
            },
          },
          unit_amount: Math.round(quote.product_price * 100), // Convert to cents
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: quote.currency.toLowerCase(),
          product_data: {
            name: `Shipping (${quote.shipping_method})`,
            description: `Delivery to ${quote.shipping_address.country}`,
          },
          unit_amount: Math.round(quote.shipping_price * 100),
        },
        quantity: 1,
      },
    ],
    customer_email: undefined, // Will be filled by Stripe
    metadata: {
      order_id: order.id,
      book_id: quote.book_id,
      quote_id: quote.id,
      workspace_id: quote.books.workspace_id,
      user_id: input.userId,
      provider: quote.provider,
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    payment_intent_data: {
      metadata: {
        order_id: order.id,
        book_id: quote.book_id,
        provider: quote.provider,
      },
    },
  })

  // Update order with Stripe session ID
  await supabase
    .from('orders')
    .update({
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
    })
    .eq('id', order.id)

  return {
    sessionId: session.id,
    url: session.url!,
    orderId: order.id,
  }
}

/**
 * Handle successful Stripe checkout webhook
 */
export async function handleCheckoutSuccess(sessionId: string): Promise<void> {
  const supabase = await createClient()

  // Get session from Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  })

  if (session.payment_status !== 'paid') {
    throw new Error('Payment not completed')
  }

  const orderId = session.metadata?.order_id
  if (!orderId) {
    throw new Error('Order ID not found in session metadata')
  }

  // Update order status
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      stripe_payment_status: session.payment_status,
      paid_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (orderError) {
    throw new Error(`Failed to update order: ${orderError.message}`)
  }

  // Create payment transaction record
  const paymentIntent = session.payment_intent as Stripe.PaymentIntent

  await supabase.from('payment_transactions').insert({
    order_id: orderId,
    provider: 'stripe',
    transaction_id: paymentIntent.id,
    amount: paymentIntent.amount / 100, // Convert from cents
    currency: paymentIntent.currency.toUpperCase(),
    status: 'succeeded',
    payment_method: paymentIntent.payment_method as string,
    metadata: {
      session_id: sessionId,
      customer_email: session.customer_email,
    },
  })

  // Create order status update
  await supabase.from('order_status_updates').insert({
    order_id: orderId,
    status: 'paid',
    message: 'Payment received successfully',
    metadata: {
      stripe_session_id: sessionId,
      payment_intent_id: paymentIntent.id,
    },
  })

  // TODO: Trigger print order submission to provider (handled by webhook or background job)
}

/**
 * Handle failed Stripe checkout
 */
export async function handleCheckoutFailure(sessionId: string): Promise<void> {
  const supabase = await createClient()

  const session = await stripe.checkout.sessions.retrieve(sessionId)
  const orderId = session.metadata?.order_id

  if (!orderId) {
    return
  }

  // Update order status
  await supabase
    .from('orders')
    .update({
      status: 'payment_failed',
      stripe_payment_status: session.payment_status,
    })
    .eq('id', orderId)

  // Create status update
  await supabase.from('order_status_updates').insert({
    order_id: orderId,
    status: 'payment_failed',
    message: 'Payment failed or was cancelled',
  })
}

/**
 * Get Stripe publishable key for client-side
 */
export function getStripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
}

/**
 * Construct webhook event from request
 */
export async function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error('Stripe webhook secret not configured')
  }

  return stripe.webhooks.constructEvent(body, signature, webhookSecret)
}
