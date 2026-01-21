/**
 * Print Orchestrator Service
 * Feature: BS-601
 *
 * Canonical interface for print-on-demand providers
 * Handles quote requests, order creation, and status tracking
 * Supports multiple POD providers through adapter pattern
 */

// ============================================================================
// TYPES - Canonical Interface
// ============================================================================

export interface PrintSpec {
  // Product type
  productType: 'book' | 'notebook' | 'photo_book'

  // Physical specs
  trimSize: {
    width: number // inches
    height: number // inches
    unit: 'in' | 'mm'
  }
  pageCount: number
  binding: 'softcover' | 'hardcover' | 'perfect_bound' | 'saddle_stitch' | 'spiral' | 'layflat'
  paperType: 'standard' | 'premium' | 'recycled' | 'glossy' | 'matte'
  paperWeight?: number // gsm
  colorSpace: 'RGB' | 'CMYK' | 'grayscale'

  // Cover
  coverFinish?: 'matte' | 'glossy' | 'soft_touch'
  coverLamination?: boolean

  // Files
  interiorPdfUrl: string
  coverPdfUrl: string
}

export interface ShippingAddress {
  name: string
  company?: string
  address1: string
  address2?: string
  city: string
  state: string
  postalCode: string
  country: string // ISO 3166-1 alpha-2 code
  phone?: string
  email?: string
}

export type ShippingMethod = 'standard' | 'express' | 'economy'

export interface QuoteRequest {
  spec: PrintSpec
  quantity: number
  destinationCountry: string
  shippingMethod?: ShippingMethod
}

export interface QuoteResult {
  providerId: string
  providerName: string

  // Pricing
  unitCost: number // Per unit
  totalCost: number // Total for quantity
  shippingCost: number
  taxCost?: number
  currency: string // ISO 4217 code

  // Timing
  estimatedProductionDays: number
  estimatedShippingDays: number
  estimatedTotalDays: number

  // Availability
  available: boolean
  unavailableReason?: string

  // Additional info
  shippingMethods?: Array<{
    id: string
    name: string
    cost: number
    estimatedDays: number
  }>

  // Quote metadata
  quoteId?: string
  expiresAt?: Date
}

export interface CreateOrderRequest {
  spec: PrintSpec
  quantity: number
  shippingAddress: ShippingAddress
  shippingMethod?: string

  // References
  bookId: string
  workspaceId: string
  userId: string
  renditionId: string

  // Metadata
  referenceId?: string
  metadata?: Record<string, any>
}

export interface OrderResult {
  success: boolean

  // Provider order info
  providerOrderId: string
  providerId: string

  // Status
  status: OrderStatus

  // Pricing (final)
  unitCost: number
  totalCost: number
  shippingCost: number
  taxCost?: number
  currency: string

  // Tracking
  trackingNumber?: string
  trackingUrl?: string

  // Timing
  estimatedDeliveryDate?: Date

  // Error handling
  error?: {
    code: string
    message: string
    details?: any
  }
}

export type OrderStatus =
  | 'pending'           // Order created, not yet submitted
  | 'submitted'         // Submitted to provider
  | 'accepted'          // Provider accepted order
  | 'in_production'     // Being printed
  | 'in_transit'        // Shipped, on the way
  | 'delivered'         // Delivered to customer
  | 'cancelled'         // Order cancelled
  | 'failed'            // Order failed
  | 'on_hold'           // On hold (payment, issue, etc.)

export interface OrderStatusUpdate {
  providerOrderId: string
  status: OrderStatus
  trackingNumber?: string
  trackingUrl?: string
  estimatedDeliveryDate?: Date
  message?: string
  updatedAt: Date
}

// ============================================================================
// ADAPTER INTERFACE
// ============================================================================

/**
 * Print Provider Adapter Interface
 * All POD providers must implement this interface
 */
export interface PrintProviderAdapter {
  /** Provider identification */
  readonly providerId: string
  readonly providerName: string

  /**
   * Get capabilities of this provider
   * Returns what product types, bindings, sizes, etc are supported
   */
  getCapabilities(): Promise<PrintProviderCapabilities>

  /**
   * Request a quote for a print job
   */
  getQuote(request: QuoteRequest): Promise<QuoteResult>

  /**
   * Create an order
   */
  createOrder(request: CreateOrderRequest): Promise<OrderResult>

  /**
   * Get order status
   */
  getOrderStatus(providerOrderId: string): Promise<OrderStatusUpdate>

  /**
   * Cancel an order
   */
  cancelOrder(providerOrderId: string): Promise<{ success: boolean; message?: string }>

  /**
   * Validate print spec before submitting
   * Returns any errors or warnings
   */
  validateSpec(spec: PrintSpec): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }>
}

export interface PrintProviderCapabilities {
  productTypes: string[]
  bindings: string[]
  trimSizes: Array<{
    width: number
    height: number
    unit: 'in' | 'mm'
    name: string
  }>
  minPages: number
  maxPages: number
  paperTypes: string[]
  colorSpaces: string[]
  shippingCountries: string[]
  features: {
    supportsTracking: boolean
    supportsWebhooks: boolean
    supportsCoverOnly: boolean
    supportsCustomInterior: boolean
    supportsBulkOrders: boolean
  }
}

// ============================================================================
// PRINT ORCHESTRATOR
// ============================================================================

/**
 * Print Orchestrator
 * Manages multiple print provider adapters and routes requests
 */
export class PrintOrchestrator {
  private adapters: Map<string, PrintProviderAdapter> = new Map()
  private defaultProviderId?: string

  /**
   * Register a print provider adapter
   */
  registerAdapter(adapter: PrintProviderAdapter, isDefault = false): void {
    this.adapters.set(adapter.providerId, adapter)

    if (isDefault || this.adapters.size === 1) {
      this.defaultProviderId = adapter.providerId
    }

    console.log(`✅ Registered print provider: ${adapter.providerName} (${adapter.providerId})`)
  }

  /**
   * Get a specific adapter by ID
   */
  getAdapter(providerId?: string): PrintProviderAdapter {
    const id = providerId || this.defaultProviderId

    if (!id) {
      throw new Error('No provider ID specified and no default provider set')
    }

    const adapter = this.adapters.get(id)

    if (!adapter) {
      throw new Error(`Print provider not found: ${id}`)
    }

    return adapter
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): PrintProviderAdapter[] {
    return Array.from(this.adapters.values())
  }

  /**
   * Get quotes from all providers (or specific providers)
   */
  async getQuotes(
    request: QuoteRequest,
    providerIds?: string[]
  ): Promise<QuoteResult[]> {
    const adaptersToQuery = providerIds
      ? providerIds.map((id) => this.getAdapter(id))
      : this.getAllAdapters()

    const quotePromises = adaptersToQuery.map(async (adapter) => {
      try {
        return await adapter.getQuote(request)
      } catch (error: any) {
        console.error(`Quote failed for ${adapter.providerName}:`, error)
        return {
          providerId: adapter.providerId,
          providerName: adapter.providerName,
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
    })

    const quotes = await Promise.all(quotePromises)

    // Sort by total cost (cheapest first)
    return quotes.sort((a, b) => {
      if (!a.available && b.available) return 1
      if (a.available && !b.available) return -1
      return (a.totalCost + a.shippingCost) - (b.totalCost + b.shippingCost)
    })
  }

  /**
   * Create order with specified provider
   */
  async createOrder(
    request: CreateOrderRequest,
    providerId?: string
  ): Promise<OrderResult> {
    const adapter = this.getAdapter(providerId)

    // Validate spec first
    const validation = await adapter.validateSpec(request.spec)

    if (!validation.valid) {
      return {
        success: false,
        providerOrderId: '',
        providerId: adapter.providerId,
        status: 'failed',
        unitCost: 0,
        totalCost: 0,
        shippingCost: 0,
        currency: 'USD',
        error: {
          code: 'INVALID_SPEC',
          message: 'Print specification validation failed',
          details: validation.errors,
        },
      }
    }

    return await adapter.createOrder(request)
  }

  /**
   * Get order status from provider
   */
  async getOrderStatus(
    providerOrderId: string,
    providerId?: string
  ): Promise<OrderStatusUpdate> {
    const adapter = this.getAdapter(providerId)
    return await adapter.getOrderStatus(providerOrderId)
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    providerOrderId: string,
    providerId?: string
  ): Promise<{ success: boolean; message?: string }> {
    const adapter = this.getAdapter(providerId)
    return await adapter.cancelOrder(providerOrderId)
  }

  /**
   * Get capabilities from all providers
   */
  async getAllCapabilities(): Promise<
    Array<{ providerId: string; providerName: string; capabilities: PrintProviderCapabilities }>
  > {
    const adapters = this.getAllAdapters()

    const capabilitiesPromises = adapters.map(async (adapter) => ({
      providerId: adapter.providerId,
      providerName: adapter.providerName,
      capabilities: await adapter.getCapabilities(),
    }))

    return await Promise.all(capabilitiesPromises)
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let orchestratorInstance: PrintOrchestrator | null = null

export function getPrintOrchestrator(): PrintOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new PrintOrchestrator()
  }
  return orchestratorInstance
}
