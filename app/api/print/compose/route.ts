/**
 * Print Composition API
 * Endpoint for getting quotes and creating orders using composed adapters
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCoverOnlyAdapter } from '@/lib/adapters/cover-only-adapter'
import { ProdigiAdapter } from '@/lib/print/adapters/prodigi'
import {
  composeAdapters,
  composeWithMultipleProviders,
  selectBestAdapter,
  type ComposedAdapter
} from '@/lib/adapters/composer'
import type { ProductSpec, QuoteRequest } from '@/lib/adapters/notebook-adapter'

// =============================================================================
// ADAPTER REGISTRY
// =============================================================================

/**
 * Get available composed adapters
 * In production, this would be configured via environment variables
 */
function getAvailableAdapters(): Map<string, ComposedAdapter> {
  const adapters = new Map<string, ComposedAdapter>()

  // Cover-only + Prodigi
  if (process.env.PRODIGI_API_KEY) {
    const coverOnly = createCoverOnlyAdapter()
    const prodigi = new ProdigiAdapter({
      apiKey: process.env.PRODIGI_API_KEY,
      environment: (process.env.PRODIGI_ENV as 'sandbox' | 'live') || 'sandbox'
    })

    adapters.set('cover-only+prodigi', composeAdapters(coverOnly, prodigi))
  }

  // Add more compositions as needed:
  // - cover-only + gelato
  // - custom-interior + prodigi
  // - etc.

  return adapters
}

/**
 * Get adapter by composition name
 */
function getAdapter(compositionName: string): ComposedAdapter | null {
  const adapters = getAvailableAdapters()
  return adapters.get(compositionName) || null
}

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * GET /api/print/compose
 * List available compositions and their capabilities
 */
export async function GET() {
  try {
    const adapters = getAvailableAdapters()

    const compositions = await Promise.all(
      Array.from(adapters.entries()).map(async ([name, adapter]) => ({
        name,
        productMode: adapter.productMode,
        capabilities: adapter.getCapabilities(),
        assetRequirements: adapter.getAssetRequirements()
      }))
    )

    return NextResponse.json({
      success: true,
      compositions
    })
  } catch (error: any) {
    console.error('Error listing compositions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/print/compose/quote
 * Get quote from composed adapter(s)
 *
 * Body:
 * {
 *   composition?: string,  // Specific composition name, or omit for all
 *   productSpec: ProductSpec,
 *   quantity: number,
 *   shippingAddress: { country: string, postalCode: string },
 *   shippingMethod?: 'standard' | 'express' | 'economy',
 *   selectBest?: 'price' | 'speed' | 'quality'  // If comparing multiple
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      composition,
      productSpec,
      quantity,
      shippingAddress,
      shippingMethod,
      selectBest
    } = body as {
      composition?: string
      productSpec: ProductSpec
      quantity: number
      shippingAddress: { country: string; postalCode: string }
      shippingMethod?: 'standard' | 'express' | 'economy'
      selectBest?: 'price' | 'speed' | 'quality'
    }

    // Validate required fields
    if (!productSpec || !quantity || !shippingAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: productSpec, quantity, shippingAddress'
        },
        { status: 400 }
      )
    }

    // Build quote request
    const quoteRequest: QuoteRequest = {
      productSpec,
      quantity,
      shippingAddress,
      shippingMethod
    }

    // Case 1: Specific composition requested
    if (composition) {
      const adapter = getAdapter(composition)

      if (!adapter) {
        return NextResponse.json(
          {
            success: false,
            error: `Composition not found: ${composition}`
          },
          { status: 404 }
        )
      }

      const quote = await adapter.getQuote(quoteRequest)

      return NextResponse.json({
        success: true,
        composition,
        quote
      })
    }

    // Case 2: Compare all adapters and select best
    const adapters = Array.from(getAvailableAdapters().values())

    if (adapters.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No print adapters configured'
        },
        { status: 503 }
      )
    }

    if (selectBest) {
      // Select best based on criteria
      const { adapter, quote } = await selectBestAdapter(
        adapters,
        quoteRequest,
        selectBest
      )

      return NextResponse.json({
        success: true,
        composition: adapter.name,
        quote,
        selectionCriteria: selectBest
      })
    }

    // Case 3: Return all quotes
    const quotes = await Promise.all(
      adapters.map(async adapter => {
        try {
          const quote = await adapter.getQuote(quoteRequest)
          return {
            composition: adapter.name,
            quote,
            available: true
          }
        } catch (error: any) {
          return {
            composition: adapter.name,
            quote: null,
            available: false,
            error: error.message
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      quotes
    })
  } catch (error: any) {
    console.error('Error getting quote:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
