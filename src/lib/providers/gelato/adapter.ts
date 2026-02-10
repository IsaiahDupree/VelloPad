/**
 * Gelato Print Provider Adapter
 * Implements PrintProviderAdapter interface for Gelato
 *
 * @see PB-032: Gelato Integration
 * @see BS-601: Print Orchestrator Service
 */

import type {
  PrintProviderAdapter,
  PrintProviderCapabilities,
  PrintSpec,
  QuoteRequest,
  QuoteResult,
  CreateOrderRequest,
  OrderResult,
  OrderStatus,
  OrderStatusUpdate,
  ShippingMethod
} from '@/lib/print/orchestrator'
import { GelatoClient } from './client'
import type {
  GelatoOrderRequest,
  GelatoOrderStatus,
  GelatoQuoteRequest
} from './types'

/**
 * Gelato photo book product UIDs
 * These should be fetched from Gelato API in production
 */
export const GELATO_PRODUCT_UIDS = {
  'hardcover-8x8': 'photobook_hardcover_200x200_20-200',
  'softcover-8x8': 'photobook_softcover_200x200_20-200',
  'layflat-8x8': 'photobook_layflat_200x200_20-120',
  'hardcover-10x10': 'photobook_hardcover_250x250_20-200',
  'softcover-10x10': 'photobook_softcover_250x250_20-200',
  'layflat-10x10': 'photobook_layflat_250x250_20-120',
  'hardcover-12x12': 'photobook_hardcover_300x300_20-200',
  'softcover-12x12': 'photobook_softcover_300x300_20-200',
  'layflat-12x12': 'photobook_layflat_300x300_20-120',
  'hardcover-8.5x11': 'photobook_hardcover_216x279_20-200',
  'softcover-8.5x11': 'photobook_softcover_216x279_20-200'
} as const

/**
 * Map Gelato order status to canonical OrderStatus
 */
function mapGelatoStatus(gelatoStatus: GelatoOrderStatus): OrderStatus {
  const statusMap: Record<GelatoOrderStatus, OrderStatus> = {
    draft: 'pending',
    pending: 'submitted',
    approved: 'accepted',
    printing: 'in_production',
    shipped: 'in_transit',
    delivered: 'delivered',
    cancelled: 'cancelled',
    on_hold: 'on_hold',
    error: 'failed'
  }
  return statusMap[gelatoStatus] || 'pending'
}

/**
 * Map canonical ShippingMethod to Gelato shipping method
 */
function mapShippingMethod(method?: ShippingMethod): string {
  const methodMap: Record<ShippingMethod, string> = {
    standard: 'standard',
    express: 'express',
    economy: 'standard'
  }
  return method ? methodMap[method] : 'standard'
}

/**
 * Get Gelato product UID from print spec
 */
function getProductUid(spec: PrintSpec): string {
  const { trimSize, binding } = spec

  // Convert trim size to inches string
  const width = trimSize.unit === 'mm' ? trimSize.width / 25.4 : trimSize.width
  const height = trimSize.unit === 'mm' ? trimSize.height / 25.4 : trimSize.height

  // Round to common sizes
  let sizeKey: string
  if (Math.abs(width - 8) < 0.5 && Math.abs(height - 8) < 0.5) {
    sizeKey = '8x8'
  } else if (Math.abs(width - 10) < 0.5 && Math.abs(height - 10) < 0.5) {
    sizeKey = '10x10'
  } else if (Math.abs(width - 12) < 0.5 && Math.abs(height - 12) < 0.5) {
    sizeKey = '12x12'
  } else if (Math.abs(width - 8.5) < 0.5 && Math.abs(height - 11) < 0.5) {
    sizeKey = '8.5x11'
  } else {
    throw new Error(`Unsupported trim size: ${width}x${height}`)
  }

  // Map binding
  let bindingKey: string
  if (binding === 'hardcover') {
    bindingKey = 'hardcover'
  } else if (binding === 'softcover' || binding === 'perfect_bound') {
    bindingKey = 'softcover'
  } else if (binding === 'layflat') {
    bindingKey = 'layflat'
  } else {
    throw new Error(`Unsupported binding: ${binding}`)
  }

  const key = `${bindingKey}-${sizeKey}` as keyof typeof GELATO_PRODUCT_UIDS
  const productUid = GELATO_PRODUCT_UIDS[key]

  if (!productUid) {
    throw new Error(`No Gelato product found for ${bindingKey} ${sizeKey}`)
  }

  return productUid
}

/**
 * Gelato Print Provider Adapter
 */
export class GelatoAdapter implements PrintProviderAdapter {
  readonly providerId = 'gelato'
  readonly providerName = 'Gelato'

  private client: GelatoClient

  constructor(client: GelatoClient) {
    this.client = client
  }

  async getCapabilities(): Promise<PrintProviderCapabilities> {
    return {
      productTypes: ['photo_book', 'book', 'notebook'],
      bindings: ['hardcover', 'softcover', 'perfect_bound', 'layflat'],
      trimSizes: [
        { width: 8, height: 8, unit: 'in', name: '8x8 Square' },
        { width: 10, height: 10, unit: 'in', name: '10x10 Square' },
        { width: 12, height: 12, unit: 'in', name: '12x12 Square' },
        { width: 8.5, height: 11, unit: 'in', name: '8.5x11 Letter' }
      ],
      minPages: 20,
      maxPages: 200,
      paperTypes: ['standard', 'premium', 'glossy', 'matte'],
      colorSpaces: ['RGB', 'CMYK'],
      shippingCountries: [
        'US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT',
        'CH', 'SE', 'DK', 'NO', 'FI', 'PL', 'CZ', 'PT', 'IE', 'AU', 'NZ', 'JP'
      ],
      features: {
        supportsTracking: true,
        supportsWebhooks: true,
        supportsCoverOnly: false,
        supportsCustomInterior: true,
        supportsBulkOrders: true
      }
    }
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResult> {
    try {
      const productUid = getProductUid(request.spec)

      const gelatoQuoteRequest: GelatoQuoteRequest = {
        shippingMethod: mapShippingMethod(request.shippingMethod),
        destinationCountry: request.destinationCountry,
        items: [{
          productUid,
          quantity: request.quantity
        }]
      }

      const quote = await this.client.getQuote(gelatoQuoteRequest)

      const unitCost = quote.itemsCost / request.quantity
      const estimatedTotalDays = quote.estimatedProductionTime + quote.estimatedShippingTime

      return {
        providerId: this.providerId,
        providerName: this.providerName,
        unitCost,
        totalCost: quote.totalCost,
        shippingCost: quote.shippingCost,
        currency: quote.currency,
        estimatedProductionDays: quote.estimatedProductionTime,
        estimatedShippingDays: quote.estimatedShippingTime,
        estimatedTotalDays,
        available: true
      }
    } catch (error: any) {
      return {
        providerId: this.providerId,
        providerName: this.providerName,
        unitCost: 0,
        totalCost: 0,
        shippingCost: 0,
        currency: 'USD',
        estimatedProductionDays: 0,
        estimatedShippingDays: 0,
        estimatedTotalDays: 0,
        available: false,
        unavailableReason: error.message
      }
    }
  }

  async createOrder(request: CreateOrderRequest): Promise<OrderResult> {
    try {
      const productUid = getProductUid(request.spec)

      const gelatoOrderRequest: GelatoOrderRequest = {
        orderReferenceId: request.referenceId || request.bookId,
        customerReferenceId: request.userId,
        shippingMethod: mapShippingMethod(request.shippingMethod as ShippingMethod),
        recipientAddress: {
          firstName: request.shippingAddress.name.split(' ')[0],
          lastName: request.shippingAddress.name.split(' ').slice(1).join(' ') || 'Customer',
          companyName: request.shippingAddress.company,
          addressLine1: request.shippingAddress.address1,
          addressLine2: request.shippingAddress.address2,
          city: request.shippingAddress.city,
          state: request.shippingAddress.state,
          postCode: request.shippingAddress.postalCode,
          country: request.shippingAddress.country,
          email: request.shippingAddress.email,
          phone: request.shippingAddress.phone
        },
        orderItems: [{
          productUid,
          quantity: request.quantity,
          files: [
            { type: 'cover', url: request.spec.coverPdfUrl },
            { type: 'content', url: request.spec.interiorPdfUrl }
          ]
        }],
        metadata: request.metadata
      }

      const order = await this.client.createOrder(gelatoOrderRequest)

      return {
        success: true,
        providerOrderId: order.id,
        providerId: this.providerId,
        status: mapGelatoStatus(order.status),
        unitCost: order.costs.itemsCost / request.quantity,
        totalCost: order.costs.totalCost,
        shippingCost: order.costs.shippingCost,
        taxCost: order.costs.taxCost,
        currency: order.costs.currency,
        trackingNumber: order.shipments[0]?.trackingNumber,
        trackingUrl: order.shipments[0]?.trackingUrl,
        estimatedDeliveryDate: order.shipments[0]?.estimatedDeliveryDate
          ? new Date(order.shipments[0].estimatedDeliveryDate)
          : undefined
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
          details: error
        }
      }
    }
  }

  async getOrderStatus(providerOrderId: string): Promise<OrderStatusUpdate> {
    const order = await this.client.getOrder(providerOrderId)

    return {
      providerOrderId: order.id,
      status: mapGelatoStatus(order.status),
      trackingNumber: order.shipments[0]?.trackingNumber,
      trackingUrl: order.shipments[0]?.trackingUrl,
      estimatedDeliveryDate: order.shipments[0]?.estimatedDeliveryDate
        ? new Date(order.shipments[0].estimatedDeliveryDate)
        : undefined,
      updatedAt: new Date(order.updatedAt)
    }
  }

  async cancelOrder(providerOrderId: string): Promise<{ success: boolean; message?: string }> {
    try {
      await this.client.cancelOrder(providerOrderId)
      return { success: true, message: 'Order cancelled successfully' }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }

  async validateSpec(spec: PrintSpec): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate page count
    if (spec.pageCount < 20) {
      errors.push('Minimum 20 pages required')
    }
    if (spec.pageCount > 200) {
      errors.push('Maximum 200 pages allowed')
    }
    if (spec.binding === 'layflat' && spec.pageCount > 120) {
      errors.push('Layflat binding supports maximum 120 pages')
    }

    // Validate page count is even
    if (spec.pageCount % 2 !== 0) {
      errors.push('Page count must be even')
    }

    // Validate trim size
    try {
      getProductUid(spec)
    } catch (error: any) {
      errors.push(error.message)
    }

    // Validate file URLs
    if (!spec.coverPdfUrl) {
      errors.push('Cover PDF URL is required')
    }
    if (!spec.interiorPdfUrl) {
      errors.push('Interior PDF URL is required')
    }

    // Warnings for quality
    if (spec.colorSpace === 'RGB') {
      warnings.push('CMYK color space recommended for print quality')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}

/**
 * Create Gelato adapter from environment variables
 */
export function createGelatoAdapter(): GelatoAdapter {
  const apiKey = process.env.GELATO_API_KEY
  const environment = (process.env.GELATO_ENVIRONMENT ||
    'sandbox') as 'sandbox' | 'production'

  if (!apiKey) {
    throw new Error('GELATO_API_KEY environment variable is required')
  }

  const client = new GelatoClient({ apiKey, environment })
  return new GelatoAdapter(client)
}
