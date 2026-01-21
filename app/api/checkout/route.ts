/**
 * Checkout API - BS-502
 *
 * POST /api/checkout - Create Stripe checkout session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe/checkout'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { quoteId } = body

    if (!quoteId) {
      return NextResponse.json(
        { error: 'Missing required field: quoteId' },
        { status: 400 }
      )
    }

    // Get the origin for redirect URLs
    const origin = request.headers.get('origin') || 'http://localhost:3000'

    // Create checkout session
    const session = await createCheckoutSession({
      quoteId,
      userId: user.id,
      successUrl: `${origin}/orders/${'{orderId}'}?session_id={CHECKOUT_SESSION_ID}`.replace(
        '{orderId}',
        'PLACEHOLDER' // Will be replaced with actual order ID
      ),
      cancelUrl: `${origin}/books?checkout=cancelled`,
    })

    // Return session with corrected success URL
    const successUrl = `${origin}/orders/${session.orderId}?session_id={CHECKOUT_SESSION_ID}`

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        url: session.url,
        orderId: session.orderId,
        successUrl,
      },
    })
  } catch (error) {
    console.error('Checkout session creation error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    )
  }
}
