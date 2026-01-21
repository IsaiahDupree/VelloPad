/**
 * Quote API - BS-501
 *
 * POST /api/quote - Request quotes from print providers
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requestQuote, type QuoteRequestInput } from '@/lib/commerce/quotes'
import type { ShippingMethod } from '@/lib/print/orchestrator'

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
    const {
      bookId,
      quantity,
      shippingAddress,
      shippingMethod,
      provider,
    } = body

    // Validate required fields
    if (!bookId || !quantity || !shippingAddress || !shippingMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, quantity, shippingAddress, shippingMethod' },
        { status: 400 }
      )
    }

    // Validate quantity
    if (typeof quantity !== 'number' || quantity < 1 || quantity > 10000) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 10,000' },
        { status: 400 }
      )
    }

    // Validate shipping address
    const { name, line1, city, state, postalCode, country } = shippingAddress
    if (!name || !line1 || !city || !state || !postalCode || !country) {
      return NextResponse.json(
        { error: 'Incomplete shipping address' },
        { status: 400 }
      )
    }

    // Validate shipping method
    const validMethods: ShippingMethod[] = ['standard', 'express', 'economy']
    if (!validMethods.includes(shippingMethod)) {
      return NextResponse.json(
        { error: `Invalid shipping method. Must be one of: ${validMethods.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify user has access to this book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('workspace_id')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Check workspace access
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', book.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build quote request
    const quoteRequest: QuoteRequestInput = {
      bookId,
      quantity,
      shippingAddress,
      shippingMethod,
      provider,
    }

    // Request quotes
    const comparison = await requestQuote(quoteRequest)

    return NextResponse.json({
      success: true,
      data: comparison,
    })
  } catch (error) {
    console.error('Quote request error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get quotes',
      },
      { status: 500 }
    )
  }
}
