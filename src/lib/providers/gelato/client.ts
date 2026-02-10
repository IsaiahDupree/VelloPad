/**
 * Gelato API Client
 * REST API client for Gelato print-on-demand service
 *
 * @see PB-032: Gelato Integration
 * @see https://www.gelato.com/docs/api/
 */

import type {
  GelatoConfig,
  GelatoOrder,
  GelatoOrderRequest,
  GelatoQuote,
  GelatoQuoteRequest,
  GelatoError,
  GelatoProduct
} from './types'

/**
 * Gelato API endpoints
 */
const GELATO_ENDPOINTS = {
  sandbox: 'https://order.gelatoapis.com/v3',
  production: 'https://order.gelatoapis.com/v3'
} as const

/**
 * Gelato API client
 */
export class GelatoClient {
  private apiKey: string
  private baseUrl: string

  constructor(config: GelatoConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || GELATO_ENDPOINTS[config.environment]

    if (!this.apiKey) {
      throw new Error('Gelato API key is required')
    }
  }

  /**
   * Make authenticated request to Gelato API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`

    const headers: Record<string, string> = {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json'
    }

    const options: RequestInit = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    }

    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        const error: GelatoError = await response.json()
        throw new Error(
          `Gelato API error: ${error.code} - ${error.message}`
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error calling Gelato API')
    }
  }

  /**
   * Create a new order
   */
  async createOrder(orderRequest: GelatoOrderRequest): Promise<GelatoOrder> {
    return this.request<GelatoOrder>('POST', '/orders', orderRequest)
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<GelatoOrder> {
    return this.request<GelatoOrder>('GET', `/orders/${orderId}`)
  }

  /**
   * Get order by reference ID
   */
  async getOrderByReference(referenceId: string): Promise<GelatoOrder> {
    const response = await this.request<{ orders: GelatoOrder[] }>(
      'GET',
      `/orders?orderReferenceId=${encodeURIComponent(referenceId)}`
    )
    if (!response.orders || response.orders.length === 0) {
      throw new Error(`Order not found with reference: ${referenceId}`)
    }
    return response.orders[0]
  }

  /**
   * Update order
   */
  async updateOrder(
    orderId: string,
    updates: Partial<GelatoOrderRequest>
  ): Promise<GelatoOrder> {
    return this.request<GelatoOrder>('PATCH', `/orders/${orderId}`, updates)
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<GelatoOrder> {
    return this.request<GelatoOrder>('DELETE', `/orders/${orderId}`)
  }

  /**
   * Get quote for order
   */
  async getQuote(quoteRequest: GelatoQuoteRequest): Promise<GelatoQuote> {
    return this.request<GelatoQuote>('POST', '/quotes', quoteRequest)
  }

  /**
   * List available products
   */
  async listProducts(): Promise<{ products: GelatoProduct[] }> {
    return this.request('GET', '/products')
  }

  /**
   * Get product details
   */
  async getProduct(productUid: string): Promise<GelatoProduct> {
    return this.request('GET', `/products/${productUid}`)
  }

  /**
   * Get shipping methods for destination
   */
  async getShippingMethods(
    destinationCountry: string
  ): Promise<Array<{ method: string; estimatedDays: number; cost: number }>> {
    return this.request(
      'GET',
      `/shipping-methods?destinationCountry=${destinationCountry}`
    )
  }
}

/**
 * Create Gelato client from environment variables
 */
export function createGelatoClient(): GelatoClient {
  const apiKey = process.env.GELATO_API_KEY
  const environment = (process.env.GELATO_ENVIRONMENT ||
    'sandbox') as 'sandbox' | 'production'

  if (!apiKey) {
    throw new Error('GELATO_API_KEY environment variable is required')
  }

  return new GelatoClient({
    apiKey,
    environment
  })
}
