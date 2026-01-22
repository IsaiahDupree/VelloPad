/**
 * Prodigi Shipping Calculator
 * Calculate domestic and international shipping costs
 *
 * @see PB-014: Shipping Calculator
 */

import type { ProdigiClient } from './client'
import type { ProdigiQuote, ProdigiQuoteRequest } from './types'

/**
 * Shipping method options
 */
export type ShippingMethod = 'Budget' | 'Standard' | 'Express' | 'Overnight'

/**
 * Shipping quote result
 */
export interface ShippingQuote {
  method: ShippingMethod
  cost: number
  currency: string
  estimatedDays?: number
  description: string
}

/**
 * Shipping calculation request
 */
export interface ShippingCalculationRequest {
  sku: string
  quantity: number
  destinationCountryCode: string
  methods?: ShippingMethod[]
}

/**
 * Shipping calculation result
 */
export interface ShippingCalculationResult {
  quotes: ShippingQuote[]
  recommendedMethod: ShippingMethod
  totalCost: number
  itemsCost: number
  currency: string
}

/**
 * Shipping method metadata
 */
const SHIPPING_METHODS: Record<
  ShippingMethod,
  { description: string; estimatedDays: number }
> = {
  Budget: {
    description: 'Budget shipping (5-10 business days)',
    estimatedDays: 7
  },
  Standard: {
    description: 'Standard shipping (3-5 business days)',
    estimatedDays: 4
  },
  Express: {
    description: 'Express shipping (1-3 business days)',
    estimatedDays: 2
  },
  Overnight: {
    description: 'Overnight shipping (next business day)',
    estimatedDays: 1
  }
}

/**
 * Calculate shipping cost via Prodigi API
 */
export async function calculateShipping(
  client: ProdigiClient,
  request: ShippingCalculationRequest
): Promise<ShippingCalculationResult> {
  const methods = request.methods || ['Budget', 'Standard', 'Express']

  // Get quotes for all requested methods
  const quotePromises = methods.map(async method => {
    const quoteRequest: ProdigiQuoteRequest = {
      shippingMethod: method,
      destinationCountryCode: request.destinationCountryCode,
      items: [
        {
          sku: request.sku,
          copies: request.quantity
        }
      ]
    }

    try {
      const quote = await client.getQuote(quoteRequest)
      return { method, quote }
    } catch (error) {
      console.error(`Failed to get quote for ${method}:`, error)
      return null
    }
  })

  const results = await Promise.all(quotePromises)

  // Convert to shipping quotes
  const quotes: ShippingQuote[] = results
    .filter((r): r is { method: ShippingMethod; quote: ProdigiQuote } => r !== null)
    .flatMap(({ method, quote }) =>
      quote.quotes.map(q => ({
        method,
        cost: q.shipping.amount,
        currency: q.shipping.currency,
        estimatedDays: SHIPPING_METHODS[method].estimatedDays,
        description: SHIPPING_METHODS[method].description
      }))
    )

  if (quotes.length === 0) {
    throw new Error('No shipping quotes available')
  }

  // Find cheapest quote as recommended
  const sortedByPrice = [...quotes].sort((a, b) => a.cost - b.cost)
  const cheapest = sortedByPrice[0]

  // Get first quote for total calculation
  const firstResult = results.find(r => r !== null)
  const firstQuote = firstResult?.quote.quotes[0]

  return {
    quotes,
    recommendedMethod: cheapest.method,
    totalCost: firstQuote?.totalCost.amount || 0,
    itemsCost: firstQuote?.items.amount || 0,
    currency: firstQuote?.totalCost.currency || 'USD'
  }
}

/**
 * Get domestic shipping methods
 */
export function getDomesticShippingMethods(): ShippingMethod[] {
  return ['Standard', 'Express', 'Overnight']
}

/**
 * Get international shipping methods
 */
export function getInternationalShippingMethods(): ShippingMethod[] {
  return ['Budget', 'Standard', 'Express']
}

/**
 * Determine if country code is domestic (US)
 */
export function isDomestic(countryCode: string): boolean {
  return countryCode.toUpperCase() === 'US'
}

/**
 * Get available shipping methods for destination
 */
export function getAvailableShippingMethods(
  countryCode: string
): ShippingMethod[] {
  return isDomestic(countryCode)
    ? getDomesticShippingMethods()
    : getInternationalShippingMethods()
}

/**
 * Format shipping quote for display
 */
export function formatShippingQuote(quote: ShippingQuote): string {
  return `${quote.method} - ${quote.currency} ${quote.cost.toFixed(2)} (${quote.estimatedDays} days)`
}

/**
 * Get shipping method display name
 */
export function getShippingMethodName(method: ShippingMethod): string {
  return SHIPPING_METHODS[method].description
}
