/**
 * Prodigi API Client
 * REST API client for Prodigi print-on-demand service
 *
 * @see PB-013: Prodigi API Integration
 * @see https://www.prodigi.com/print-api/docs/reference/
 */

import type {
  ProdigiConfig,
  ProdigiOrder,
  ProdigiOrderRequest,
  ProdigiQuote,
  ProdigiQuoteRequest,
  ProdigiError
} from './types'

/**
 * Prodigi API endpoints
 */
const PRODIGI_ENDPOINTS = {
  sandbox: 'https://api.sandbox.prodigi.com/v4.0',
  production: 'https://api.prodigi.com/v4.0'
} as const

/**
 * Prodigi API client
 */
export class ProdigiClient {
  private apiKey: string
  private baseUrl: string

  constructor(config: ProdigiConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || PRODIGI_ENDPOINTS[config.environment]

    if (!this.apiKey) {
      throw new Error('Prodigi API key is required')
    }
  }

  /**
   * Make authenticated request to Prodigi API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`

    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
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
        const error: ProdigiError = await response.json()
        throw new Error(
          `Prodigi API error: ${error.code} - ${error.message}`
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error calling Prodigi API')
    }
  }

  /**
   * Create a new order
   */
  async createOrder(orderRequest: ProdigiOrderRequest): Promise<ProdigiOrder> {
    return this.request<ProdigiOrder>('POST', '/orders', orderRequest)
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<ProdigiOrder> {
    return this.request<ProdigiOrder>('GET', `/orders/${orderId}`)
  }

  /**
   * Get order by merchant reference
   */
  async getOrderByReference(reference: string): Promise<ProdigiOrder[]> {
    const response = await this.request<{ orders: ProdigiOrder[] }>(
      'GET',
      `/orders?merchantReference=${encodeURIComponent(reference)}`
    )
    return response.orders
  }

  /**
   * Update order
   */
  async updateOrder(
    orderId: string,
    updates: Partial<ProdigiOrderRequest>
  ): Promise<ProdigiOrder> {
    return this.request<ProdigiOrder>('PATCH', `/orders/${orderId}`, updates)
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<ProdigiOrder> {
    return this.request<ProdigiOrder>('DELETE', `/orders/${orderId}`)
  }

  /**
   * Get quote for order
   */
  async getQuote(quoteRequest: ProdigiQuoteRequest): Promise<ProdigiQuote> {
    return this.request<ProdigiQuote>('POST', '/quotes', quoteRequest)
  }

  /**
   * List available products
   */
  async listProducts(): Promise<any> {
    return this.request('GET', '/products')
  }

  /**
   * Get product details
   */
  async getProduct(sku: string): Promise<any> {
    return this.request('GET', `/products/${sku}`)
  }

  /**
   * Submit order for processing
   */
  async submitOrder(orderId: string): Promise<ProdigiOrder> {
    return this.request<ProdigiOrder>(
      'POST',
      `/orders/${orderId}/actions/submit`
    )
  }
}

/**
 * Create Prodigi client from environment variables
 */
export function createProdigiClient(): ProdigiClient {
  const apiKey = process.env.PRODIGI_API_KEY
  const environment = (process.env.PRODIGI_ENVIRONMENT ||
    'sandbox') as 'sandbox' | 'production'

  if (!apiKey) {
    throw new Error('PRODIGI_API_KEY environment variable is required')
  }

  return new ProdigiClient({
    apiKey,
    environment
  })
}
