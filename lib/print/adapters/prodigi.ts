/**
 * Prodigi Print Provider Adapter
 * Feature: BS-602
 *
 * Adapter for Prodigi API (https://www.prodigi.com)
 * Handles book printing, shipping quotes, and order fulfillment
 */

import type {
  PrintProviderAdapter,
  PrintProviderCapabilities,
  PrintSpec,
  QuoteRequest,
  QuoteResult,
  CreateOrderRequest,
  OrderResult,
  OrderStatusUpdate,
  OrderStatus,
} from '../orchestrator'

// ============================================================================
// PRODIGI API TYPES
// ============================================================================

interface ProdigiQuoteRequest {
  shippingMethod: 'Budget' | 'Standard' | 'Express'
  destinationCountryCode: string
  currencyCode: string
  items: Array<{
    sku: string
    copies: number
    sizing: 'fillPrintArea' | 'fitPrintArea'
    attributes?: Record<string, string>
    assets: Array<{
      printArea: string
      url: string
    }>
  }>
}

interface ProdigiQuoteResponse {
  outcome: 'Created'
  quotes: Array<{
    quotesId: string
    totalCost: {
      amount: string
      currency: string
    }
    items: Array<{
      itemCosts: {
        amount: string
        currency: string
      }
    }>
    shipmentCost: {
      amount: string
      currency: string
    }
  }>
}

interface ProdigiOrderRequest {
  shippingMethod: 'Budget' | 'Standard' | 'Express'
  recipient: {
    name: string
    address: {
      line1: string
      line2?: string
      postalOrZipCode: string
      countryCode: string
      townOrCity: string
      stateOrCounty?: string
    }
    email?: string
    phoneNumber?: string
  }
  items: Array<{
    sku: string
    copies: number
    sizing: 'fillPrintArea' | 'fitPrintArea'
    attributes?: Record<string, string>
    recipientCost?: {
      amount: string
      currency: string
    }
    assets: Array<{
      printArea: string
      url: string
    }>
  }>
  metadata?: Record<string, any>
}

interface ProdigiOrderResponse {
  outcome: 'Created'
  order: {
    id: string
    created: string
    status: {
      stage: string
      details: {
        progress: string
      }
    }
    charges: Array<{
      id: string
      prodigiInvoiceNumber: string
      totalCost: {
        amount: string
        currency: string
      }
      items: Array<{
        id: string
        status: string
      }>
    }>
    shipments: Array<{
      id: string
      carrier: {
        name: string
        service: string
      }
      tracking: {
        number: string
        url: string
      }
      dispatchDate: string
      items: Array<{
        id: string
      }>
    }>
  }
}

// ============================================================================
// PRODIGI ADAPTER
// ============================================================================

export class ProdigiAdapter implements PrintProviderAdapter {
  readonly providerId = 'prodigi'
  readonly providerName = 'Prodigi'

  private apiKey: string
  private baseUrl: string
  private environment: 'sandbox' | 'live'

  constructor(options?: {
    apiKey?: string
    environment?: 'sandbox' | 'live'
  }) {
    this.apiKey = options?.apiKey || process.env.PRODIGI_API_KEY || ''
    this.environment = options?.environment || 'sandbox'
    this.baseUrl = this.environment === 'live'
      ? 'https://api.prodigi.com/v4.0'
      : 'https://api.sandbox.prodigi.com/v4.0'

    if (!this.apiKey) {
      console.warn('⚠️  Prodigi API key not configured')
    }
  }

  // ==========================================================================
  // API CLIENT
  // ==========================================================================

  private async apiRequest<T = any>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      method,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Prodigi API error (${response.status}): ${error}`)
    }

    return await response.json()
  }

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  /**
   * Map print spec to Prodigi SKU
   * TODO: Expand with more product variations
   */
  private getProdigiSKU(spec: PrintSpec): string {
    const { binding, trimSize, paperType } = spec

    // Example SKUs (these are illustrative - actual SKUs from Prodigi catalog needed)
    // Hardcover books: GLOBAL-HPB-*
    // Softcover books: GLOBAL-SPB-*

    if (binding === 'hardcover') {
      if (trimSize.width === 6 && trimSize.height === 9) {
        return 'GLOBAL-HPB-6X9' // Hardcover 6x9
      }
      if (trimSize.width === 8.5 && trimSize.height === 11) {
        return 'GLOBAL-HPB-8.5X11' // Hardcover 8.5x11
      }
    }

    if (binding === 'softcover' || binding === 'perfect_bound') {
      if (trimSize.width === 6 && trimSize.height === 9) {
        return 'GLOBAL-SPB-6X9' // Softcover 6x9
      }
      if (trimSize.width === 8.5 && trimSize.height === 11) {
        return 'GLOBAL-SPB-8.5X11' // Softcover 8.5x11
      }
    }

    throw new Error(`Unsupported book specification: ${binding} ${trimSize.width}x${trimSize.height}`)
  }

  /**
   * Map shipping method to Prodigi format
   */
  private mapShippingMethod(method?: string): 'Budget' | 'Standard' | 'Express' {
    switch (method) {
      case 'economy':
        return 'Budget'
      case 'express':
        return 'Express'
      default:
        return 'Standard'
    }
  }

  /**
   * Map Prodigi order status to canonical status
   */
  private mapOrderStatus(prodigiStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      'Draft': 'pending',
      'Submitted': 'submitted',
      'InProgress': 'in_production',
      'Complete': 'delivered',
      'Cancelled': 'cancelled',
      'AwaitingPayment': 'on_hold',
    }

    return statusMap[prodigiStatus] || 'pending'
  }

  // ==========================================================================
  // ADAPTER INTERFACE IMPLEMENTATION
  // ==========================================================================

  async getCapabilities(): Promise<PrintProviderCapabilities> {
    return {
      productTypes: ['book', 'photo_book', 'notebook'],
      bindings: ['hardcover', 'softcover', 'perfect_bound'],
      trimSizes: [
        { width: 5, height: 8, unit: 'in', name: '5" x 8"' },
        { width: 6, height: 9, unit: 'in', name: '6" x 9"' },
        { width: 8, height: 10, unit: 'in', name: '8" x 10"' },
        { width: 8.5, height: 11, unit: 'in', name: '8.5" x 11" (US Letter)' },
        { width: 8.27, height: 11.69, unit: 'in', name: 'A4' },
      ],
      minPages: 24,
      maxPages: 600,
      paperTypes: ['standard', 'premium'],
      colorSpaces: ['RGB', 'CMYK'],
      shippingCountries: [
        'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE',
        // Prodigi ships to 100+ countries
      ],
      features: {
        supportsTracking: true,
        supportsWebhooks: true,
        supportsCoverOnly: false,
        supportsCustomInterior: true,
        supportsBulkOrders: true,
      },
    }
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResult> {
    try {
      const sku = this.getProdigiSKU(request.spec)

      const quoteRequest: ProdigiQuoteRequest = {
        shippingMethod: this.mapShippingMethod(request.shippingMethod),
        destinationCountryCode: request.destinationCountry,
        currencyCode: 'USD',
        items: [
          {
            sku,
            copies: request.quantity,
            sizing: 'fillPrintArea',
            assets: [
              {
                printArea: 'default',
                url: request.spec.interiorPdfUrl,
              },
            ],
          },
        ],
      }

      const response = await this.apiRequest<ProdigiQuoteResponse>(
        'POST',
        '/quotes',
        quoteRequest
      )

      const quote = response.quotes[0]

      return {
        providerId: this.providerId,
        providerName: this.providerName,
        unitCost: parseFloat(quote.items[0].itemCosts.amount),
        totalCost: parseFloat(quote.totalCost.amount),
        shippingCost: parseFloat(quote.shipmentCost.amount),
        currency: quote.totalCost.currency,
        estimatedProductionDays: 3, // Prodigi typical: 2-3 days
        estimatedShippingDays: 7, // Varies by method
        estimatedTotalDays: 10,
        available: true,
        quoteId: quote.quotesId,
      }
    } catch (error: any) {
      return {
        providerId: this.providerId,
        providerName: this.providerName,
        available: false,
        unavailableReason: error.message,
        unitCost: 0,
        totalCost: 0,
        shippingCost: 0,
        currency: 'USD',
        estimatedProductionDays: 0,
        estimatedShippingDays: 0,
        estimatedTotalDays: 0,
      }
    }
  }

  async createOrder(request: CreateOrderRequest): Promise<OrderResult> {
    try {
      const sku = this.getProdigiSKU(request.spec)

      const orderRequest: ProdigiOrderRequest = {
        shippingMethod: this.mapShippingMethod(request.shippingMethod),
        recipient: {
          name: request.shippingAddress.name,
          address: {
            line1: request.shippingAddress.address1,
            line2: request.shippingAddress.address2,
            postalOrZipCode: request.shippingAddress.postalCode,
            countryCode: request.shippingAddress.country,
            townOrCity: request.shippingAddress.city,
            stateOrCounty: request.shippingAddress.state,
          },
          email: request.shippingAddress.email,
          phoneNumber: request.shippingAddress.phone,
        },
        items: [
          {
            sku,
            copies: request.quantity,
            sizing: 'fillPrintArea',
            assets: [
              {
                printArea: 'default',
                url: request.spec.interiorPdfUrl,
              },
            ],
          },
        ],
        metadata: {
          ...request.metadata,
          bookId: request.bookId,
          workspaceId: request.workspaceId,
          userId: request.userId,
          renditionId: request.renditionId,
        },
      }

      const response = await this.apiRequest<ProdigiOrderResponse>(
        'POST',
        '/orders',
        orderRequest
      )

      const order = response.order
      const charge = order.charges[0]

      return {
        success: true,
        providerOrderId: order.id,
        providerId: this.providerId,
        status: this.mapOrderStatus(order.status.stage),
        unitCost: parseFloat(charge.totalCost.amount) / request.quantity,
        totalCost: parseFloat(charge.totalCost.amount),
        shippingCost: 0, // Included in total
        currency: charge.totalCost.currency,
      }
    } catch (error: any) {
      return {
        success: false,
        providerOrderId: '',
        providerId: this.providerId,
        status: 'failed',
        unitCost: 0,
        totalCost: 0,
        shippingCost: 0,
        currency: 'USD',
        error: {
          code: 'ORDER_CREATION_FAILED',
          message: error.message,
        },
      }
    }
  }

  async getOrderStatus(providerOrderId: string): Promise<OrderStatusUpdate> {
    const response = await this.apiRequest<ProdigiOrderResponse>(
      'GET',
      `/orders/${providerOrderId}`
    )

    const order = response.order
    const shipment = order.shipments[0]

    return {
      providerOrderId: order.id,
      status: this.mapOrderStatus(order.status.stage),
      trackingNumber: shipment?.tracking?.number,
      trackingUrl: shipment?.tracking?.url,
      message: order.status.details.progress,
      updatedAt: new Date(),
    }
  }

  async cancelOrder(providerOrderId: string): Promise<{ success: boolean; message?: string }> {
    try {
      await this.apiRequest('DELETE', `/orders/${providerOrderId}`)

      return {
        success: true,
        message: 'Order cancelled successfully',
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      }
    }
  }

  async validateSpec(spec: PrintSpec): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Check binding support
    if (!['hardcover', 'softcover', 'perfect_bound'].includes(spec.binding)) {
      errors.push(`Unsupported binding: ${spec.binding}`)
    }

    // Check page count
    if (spec.pageCount < 24) {
      errors.push(`Page count (${spec.pageCount}) is below minimum (24 pages)`)
    }
    if (spec.pageCount > 600) {
      errors.push(`Page count (${spec.pageCount}) exceeds maximum (600 pages)`)
    }

    // Check PDF URLs
    if (!spec.interiorPdfUrl) {
      errors.push('Interior PDF URL is required')
    }

    // Check color space
    if (spec.colorSpace === 'grayscale') {
      warnings.push('Grayscale may require special SKU selection')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}
