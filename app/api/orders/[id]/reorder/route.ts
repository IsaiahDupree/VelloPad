/**
 * Reorder API Endpoint - BS-504
 *
 * POST /api/orders/[id]/reorder - Create a reorder quote from existing order
 * GET /api/orders/[id]/reorder - Check if order can be reordered
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  canReorder,
  getReorderDetails,
  createReorderQuote,
  type ReorderRequest,
} from '@/lib/commerce/reorder'

/**
 * GET /api/orders/[id]/reorder
 * Check if order can be reordered and get reorder details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if order can be reordered
    const reorderCheck = await canReorder(id)

    if (!reorderCheck.canReorder) {
      return NextResponse.json(
        {
          canReorder: false,
          reason: reorderCheck.reason,
        },
        { status: 200 }
      )
    }

    // Get reorder details
    const details = await getReorderDetails(id)

    if (!details) {
      return NextResponse.json(
        { error: 'Failed to get reorder details' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      canReorder: true,
      renditionId: reorderCheck.renditionId,
      details: {
        book: details.book,
        originalOrder: {
          orderNumber: details.originalOrder.order_number,
          quantity: 1, // Default quantity
          provider: details.originalOrder.provider,
          shippingMethod: details.originalOrder.shipping_method,
          shippingAddress: {
            name: details.originalOrder.customer_name,
            line1: details.originalOrder.shipping_address_line1,
            line2: details.originalOrder.shipping_address_line2,
            city: details.originalOrder.shipping_city,
            state: details.originalOrder.shipping_state,
            postalCode: details.originalOrder.shipping_postal_code,
            country: details.originalOrder.shipping_country_code,
          },
          pricing: {
            subtotal: details.originalOrder.subtotal_cents / 100,
            shipping: details.originalOrder.shipping_cents / 100,
            tax: details.originalOrder.tax_cents / 100,
            total: details.originalOrder.total_cents / 100,
            currency: details.originalOrder.currency_code,
          },
        },
      },
    })
  } catch (error) {
    console.error('[Reorder Check Error]', error)
    return NextResponse.json(
      { error: 'Failed to check reorder status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/orders/[id]/reorder
 * Create a reorder quote
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const reorderRequest: Partial<ReorderRequest> = {
      quantity: body.quantity,
      shippingAddress: body.shippingAddress,
      shippingMethod: body.shippingMethod,
    }

    // Create reorder quote
    const result = await createReorderQuote(id, reorderRequest)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      quoteId: result.quoteId,
      message: 'Reorder quote created successfully',
    })
  } catch (error) {
    console.error('[Reorder Error]', error)
    return NextResponse.json(
      { error: 'Failed to create reorder' },
      { status: 500 }
    )
  }
}
