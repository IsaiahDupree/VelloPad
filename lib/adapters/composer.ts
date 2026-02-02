/**
 * Print Provider Adapter Composition
 * Feature: PM-009
 *
 * Composes product mode adapters (cover-only, custom interior) with
 * print provider adapters (Prodigi, Gelato, etc.) to create a unified
 * order flow.
 *
 * This allows mixing and matching:
 * - CoverOnlyAdapter + ProdigiAdapter
 * - CustomInteriorAdapter + GelatoAdapter
 * - BlankNotebookAdapter + LuluAdapter
 * etc.
 */

import type {
  NotebookAdapter,
  ProductSpec,
  QuoteRequest as NotebookQuoteRequest,
  QuoteResponse as NotebookQuoteResponse,
  CreateOrderRequest as NotebookOrderRequest,
  CreateOrderResponse as NotebookOrderResponse,
  OrderStatusUpdate as NotebookStatusUpdate,
  PreflightResult,
  ProductCapabilities,
  AssetRequirements
} from './notebook-adapter'

import type {
  PrintProviderAdapter,
  PrintSpec,
  QuoteRequest as PrintQuoteRequest,
  QuoteResult,
  CreateOrderRequest as PrintOrderRequest,
  OrderResult,
  OrderStatusUpdate,
  ShippingAddress
} from '@/lib/print/orchestrator'

/**
 * Composition Configuration
 */
export interface ComposerConfig {
  // Product mode adapter (defines what the user can customize)
  productAdapter: NotebookAdapter

  // Print provider adapter (handles actual printing)
  printAdapter: PrintProviderAdapter

  // Optional: Transformation rules
  transformations?: {
    // Map product spec fields to print spec fields
    specMapping?: Record<string, string>

    // Override default values
    defaults?: Partial<PrintSpec>
  }
}

/**
 * Composed Adapter
 * Bridges product mode logic with print provider capabilities
 */
export class ComposedAdapter implements NotebookAdapter {
  readonly name: string
  readonly version = '1.0.0'
  readonly productMode: 'cover-only' | 'custom-interior' | 'blank'

  private productAdapter: NotebookAdapter
  private printAdapter: PrintProviderAdapter
  private transformations?: ComposerConfig['transformations']

  constructor(config: ComposerConfig) {
    this.productAdapter = config.productAdapter
    this.printAdapter = config.printAdapter
    this.transformations = config.transformations

    this.name = `${this.productAdapter.name}+${this.printAdapter.providerId}`
    this.productMode = this.productAdapter.productMode

    console.log(`✅ Created composed adapter: ${this.name}`)
  }

  // ==========================================================================
  // CAPABILITIES & REQUIREMENTS (from product adapter)
  // ==========================================================================

  getCapabilities(): ProductCapabilities {
    const productCaps = this.productAdapter.getCapabilities()

    // Filter capabilities by what the print provider actually supports
    // This ensures we only advertise what we can actually fulfill
    return {
      ...productCaps,
      // Intersect compatible providers
      compatibleProviders: [
        ...productCaps.compatibleProviders,
        this.printAdapter.providerId
      ].filter((v, i, a) => a.indexOf(v) === i) // unique
    }
  }

  getAssetRequirements(): AssetRequirements {
    return this.productAdapter.getAssetRequirements()
  }

  // ==========================================================================
  // VALIDATION (delegates to product adapter)
  // ==========================================================================

  validateSpec(spec: ProductSpec): { valid: boolean; errors: string[] } {
    return this.productAdapter.validateSpec(spec)
  }

  async preflight(
    spec: ProductSpec,
    assets: { coverPdfUrl: string; interiorPdfUrl: string }
  ): Promise<PreflightResult> {
    // Run product adapter preflight
    const productPreflight = await this.productAdapter.preflight(spec, assets)

    // Convert to print spec and validate with print provider
    const printSpec = this.productSpecToPrintSpec(spec, assets)
    const providerValidation = await this.printAdapter.validateSpec(printSpec)

    // Merge results
    const errors = [
      ...productPreflight.errors,
      ...providerValidation.errors.map(e => ({
        code: 'PROVIDER_VALIDATION_ERROR',
        severity: 'error' as const,
        message: e
      }))
    ]

    const warnings = [
      ...productPreflight.warnings,
      ...providerValidation.warnings.map(w => ({
        code: 'PROVIDER_VALIDATION_WARNING',
        severity: 'warning' as const,
        message: w
      }))
    ]

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      checks: productPreflight.checks
    }
  }

  // ==========================================================================
  // QUOTING (composes both adapters)
  // ==========================================================================

  async getQuote(request: NotebookQuoteRequest): Promise<NotebookQuoteResponse> {
    // Validate product spec first
    const validation = this.validateSpec(request.productSpec)
    if (!validation.valid) {
      throw new Error(`Invalid product spec: ${validation.errors.join(', ')}`)
    }

    // Get assets for the product (e.g., stock interior PDF)
    const assets = await this.resolveAssets(request.productSpec)

    // Convert to print quote request
    const printSpec = this.productSpecToPrintSpec(request.productSpec, assets)

    const printQuoteRequest: PrintQuoteRequest = {
      spec: printSpec,
      quantity: request.quantity,
      destinationCountry: request.shippingAddress.country,
      shippingMethod: request.shippingMethod
    }

    // Get quote from print provider
    const printQuote = await this.printAdapter.getQuote(printQuoteRequest)

    if (!printQuote.available) {
      throw new Error(
        `Print provider unavailable: ${printQuote.unavailableReason || 'Unknown reason'}`
      )
    }

    // Convert to notebook quote response
    return {
      provider: this.printAdapter.providerId,
      quoteId: printQuote.quoteId || `quote-${Date.now()}`,
      productionCost: printQuote.totalCost,
      shippingCost: printQuote.shippingCost,
      totalCost: printQuote.totalCost + printQuote.shippingCost,
      currency: printQuote.currency,
      estimatedProductionDays: printQuote.estimatedProductionDays,
      estimatedShippingDays: printQuote.estimatedShippingDays,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        productAdapter: this.productAdapter.name,
        printProvider: this.printAdapter.providerName,
        productMode: this.productMode,
        printQuote
      }
    }
  }

  // ==========================================================================
  // ORDERING (delegates to print adapter with transformations)
  // ==========================================================================

  async createOrder(request: NotebookOrderRequest): Promise<NotebookOrderResponse> {
    // Validate and preflight
    const validation = this.validateSpec(request.productSpec)
    if (!validation.valid) {
      throw new Error(`Invalid product spec: ${validation.errors.join(', ')}`)
    }

    const preflightResult = await this.preflight(request.productSpec, request.assets)
    if (!preflightResult.passed) {
      throw new Error(
        `Preflight failed: ${preflightResult.errors.map(e => e.message).join(', ')}`
      )
    }

    // Convert to print order request
    const printSpec = this.productSpecToPrintSpec(request.productSpec, request.assets)

    const printOrderRequest: PrintOrderRequest = {
      spec: printSpec,
      quantity: request.quantity,
      shippingAddress: this.convertShippingAddress(request.shippingAddress),
      shippingMethod: request.shippingMethod,
      bookId: '', // These would come from context
      workspaceId: '',
      userId: '',
      renditionId: '',
      metadata: {
        productAdapter: this.productAdapter.name,
        productMode: this.productMode,
        productSpec: request.productSpec,
        ...(request.metadata || {})
      }
    }

    // Create order with print provider
    const orderResult = await this.printAdapter.createOrder(printOrderRequest)

    if (!orderResult.success) {
      throw new Error(
        `Order creation failed: ${orderResult.error?.message || 'Unknown error'}`
      )
    }

    // Convert to notebook order response
    return {
      provider: this.printAdapter.providerId,
      providerOrderId: orderResult.providerOrderId,
      orderId: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: this.mapOrderStatus(orderResult.status),
      estimatedDeliveryDate: orderResult.estimatedDeliveryDate?.toISOString(),
      trackingNumber: orderResult.trackingNumber,
      metadata: {
        productAdapter: this.productAdapter.name,
        printProvider: this.printAdapter.providerName,
        productMode: this.productMode,
        printOrderResult: orderResult
      }
    }
  }

  // ==========================================================================
  // STATUS TRACKING (delegates to print adapter)
  // ==========================================================================

  async getOrderStatus(providerOrderId: string): Promise<NotebookStatusUpdate> {
    const printStatus = await this.printAdapter.getOrderStatus(providerOrderId)

    return {
      orderId: providerOrderId,
      status: this.mapOrderStatus(printStatus.status),
      trackingNumber: printStatus.trackingNumber,
      estimatedDeliveryDate: printStatus.estimatedDeliveryDate?.toISOString(),
      metadata: {
        productAdapter: this.productAdapter.name,
        printProvider: this.printAdapter.providerName,
        printStatus
      }
    }
  }

  // ==========================================================================
  // TRANSFORMATION HELPERS
  // ==========================================================================

  /**
   * Convert product spec to print spec
   * This is where the magic happens - translating high-level product
   * specifications into provider-specific print specifications
   */
  private productSpecToPrintSpec(
    productSpec: ProductSpec,
    assets: { coverPdfUrl: string; interiorPdfUrl: string }
  ): PrintSpec {
    // Parse page size
    const [width, height] = productSpec.pageSize.split('x').map(s => parseFloat(s))

    // Map binding type
    const bindingMap: Record<string, PrintSpec['binding']> = {
      'perfect_bound': 'perfect_bound',
      'saddle_stitch': 'saddle_stitch',
      'spiral': 'spiral',
      'coil': 'spiral',
      'wire-o': 'spiral',
      'layflat': 'layflat',
      'hardcover': 'hardcover'
    }

    // Map paper type
    const paperMap: Record<string, PrintSpec['paperType']> = {
      'standard-white': 'standard',
      'cream': 'standard',
      'premium-white': 'premium',
      'recycled': 'recycled',
      'heavyweight': 'premium'
    }

    // Base print spec
    const printSpec: PrintSpec = {
      productType: this.mapProductType(productSpec.productMode),
      trimSize: {
        width,
        height,
        unit: 'in'
      },
      pageCount: productSpec.pageCount,
      binding: bindingMap[productSpec.bindingType] || 'perfect_bound',
      paperType: paperMap[productSpec.paperType] || 'standard',
      colorSpace: productSpec.printSpec.colorMode === 'color' ? 'CMYK' : 'RGB',
      coverFinish: productSpec.printSpec.finish,
      interiorPdfUrl: assets.interiorPdfUrl,
      coverPdfUrl: assets.coverPdfUrl
    }

    // Apply transformation defaults
    if (this.transformations?.defaults) {
      Object.assign(printSpec, this.transformations.defaults)
    }

    return printSpec
  }

  /**
   * Convert notebook shipping address to print provider format
   */
  private convertShippingAddress(address: NotebookOrderRequest['shippingAddress']): ShippingAddress {
    return {
      name: address.name,
      address1: address.line1,
      address2: address.line2,
      city: address.city,
      state: address.state || '',
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
      email: '' // Would come from user context
    }
  }

  /**
   * Map product mode to print product type
   */
  private mapProductType(productMode: string): PrintSpec['productType'] {
    switch (productMode) {
      case 'cover-only':
      case 'custom-interior':
        return 'notebook'
      default:
        return 'book'
    }
  }

  /**
   * Map print order status to notebook order status
   */
  private mapOrderStatus(printStatus: OrderResult['status'] | OrderStatusUpdate['status']): NotebookStatusUpdate['status'] {
    const statusMap: Record<string, NotebookStatusUpdate['status']> = {
      'pending': 'pending',
      'submitted': 'processing',
      'accepted': 'processing',
      'in_production': 'printing',
      'in_transit': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'failed': 'error',
      'on_hold': 'pending'
    }

    return statusMap[printStatus] || 'pending'
  }

  /**
   * Resolve assets for the product spec
   * For cover-only mode, this retrieves the stock interior PDF
   * For custom interior, this would be provided in the request
   */
  private async resolveAssets(productSpec: ProductSpec): Promise<{
    coverPdfUrl: string
    interiorPdfUrl: string
  }> {
    const assets = {
      coverPdfUrl: productSpec.coverDesign.frontImage || '',
      interiorPdfUrl: ''
    }

    // For cover-only mode, get stock interior PDF
    if (productSpec.interior.type === 'stock' && productSpec.interior.stockInteriorId) {
      const stockInterior = this.productAdapter.getStockInterior?.(
        productSpec.interior.stockInteriorId
      )

      if (stockInterior?.pdfUrl) {
        assets.interiorPdfUrl = stockInterior.pdfUrl
      }
    }
    // For custom interior, PDF URL should be in customContent
    else if (productSpec.interior.type === 'custom') {
      // This would be generated by the custom interior renderer
      assets.interiorPdfUrl = productSpec.interior.customContent?.pdfUrl || ''
    }

    return assets
  }

  // ==========================================================================
  // OPTIONAL METHODS (delegate to product adapter)
  // ==========================================================================

  generateInteriorPdf?(content: any): Promise<string> {
    return this.productAdapter.generateInteriorPdf?.(content) || Promise.reject(
      new Error('Interior PDF generation not supported')
    )
  }

  getStockInterior?(interiorId: string): any {
    return this.productAdapter.getStockInterior?.(interiorId)
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a composed adapter from product adapter and print adapter
 */
export function composeAdapters(
  productAdapter: NotebookAdapter,
  printAdapter: PrintProviderAdapter,
  options?: Omit<ComposerConfig, 'productAdapter' | 'printAdapter'>
): ComposedAdapter {
  return new ComposedAdapter({
    productAdapter,
    printAdapter,
    ...options
  })
}

/**
 * Create multiple compositions for a single product adapter
 * This allows getting quotes from multiple print providers
 */
export function composeWithMultipleProviders(
  productAdapter: NotebookAdapter,
  printAdapters: PrintProviderAdapter[],
  options?: Omit<ComposerConfig, 'productAdapter' | 'printAdapter'>
): ComposedAdapter[] {
  return printAdapters.map(printAdapter =>
    composeAdapters(productAdapter, printAdapter, options)
  )
}

/**
 * Select best adapter based on quote results
 */
export async function selectBestAdapter(
  composers: ComposedAdapter[],
  request: NotebookQuoteRequest,
  criteria: 'price' | 'speed' | 'quality' = 'price'
): Promise<{ adapter: ComposedAdapter; quote: NotebookQuoteResponse }> {
  // Get quotes from all adapters
  const quotePromises = composers.map(async adapter => {
    try {
      const quote = await adapter.getQuote(request)
      return { adapter, quote, error: null }
    } catch (error: any) {
      return { adapter, quote: null, error: error.message }
    }
  })

  const results = await Promise.all(quotePromises)

  // Filter successful quotes
  const successfulQuotes = results.filter(r => r.quote !== null) as Array<{
    adapter: ComposedAdapter
    quote: NotebookQuoteResponse
  }>

  if (successfulQuotes.length === 0) {
    throw new Error('No print providers available for this request')
  }

  // Sort by criteria
  let sorted: typeof successfulQuotes

  switch (criteria) {
    case 'price':
      sorted = successfulQuotes.sort((a, b) => a.quote.totalCost - b.quote.totalCost)
      break

    case 'speed':
      sorted = successfulQuotes.sort(
        (a, b) =>
          (a.quote.estimatedProductionDays + a.quote.estimatedShippingDays) -
          (b.quote.estimatedProductionDays + b.quote.estimatedShippingDays)
      )
      break

    case 'quality':
      // For quality, prefer providers with higher production cost (usually indicates better quality)
      sorted = successfulQuotes.sort((a, b) => b.quote.productionCost - a.quote.productionCost)
      break

    default:
      sorted = successfulQuotes
  }

  return sorted[0]
}

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/**
 * Example: Create a cover-only notebook with Prodigi
 *
 * ```typescript
 * import { createCoverOnlyAdapter } from './cover-only-adapter'
 * import { ProdigiAdapter } from '@/lib/print/adapters/prodigi'
 * import { composeAdapters } from './composer'
 *
 * const coverOnlyAdapter = createCoverOnlyAdapter()
 * const prodigiAdapter = new ProdigiAdapter({ apiKey: 'xxx' })
 *
 * const composedAdapter = composeAdapters(coverOnlyAdapter, prodigiAdapter)
 *
 * // Get quote
 * const quote = await composedAdapter.getQuote({
 *   productSpec: { ... },
 *   quantity: 100,
 *   shippingAddress: { country: 'US', postalCode: '10001' }
 * })
 *
 * // Create order
 * const order = await composedAdapter.createOrder({
 *   productSpec: { ... },
 *   quantity: 100,
 *   shippingAddress: { ... },
 *   assets: { coverPdfUrl: '...', interiorPdfUrl: '...' }
 * })
 * ```
 */

/**
 * Example: Get quotes from multiple providers and select cheapest
 *
 * ```typescript
 * import { createCoverOnlyAdapter } from './cover-only-adapter'
 * import { ProdigiAdapter } from '@/lib/print/adapters/prodigi'
 * import { GelatoAdapter } from '@/lib/print/adapters/gelato'
 * import { composeWithMultipleProviders, selectBestAdapter } from './composer'
 *
 * const coverOnlyAdapter = createCoverOnlyAdapter()
 * const composers = composeWithMultipleProviders(coverOnlyAdapter, [
 *   new ProdigiAdapter(),
 *   new GelatoAdapter()
 * ])
 *
 * const { adapter, quote } = await selectBestAdapter(
 *   composers,
 *   quoteRequest,
 *   'price' // or 'speed' or 'quality'
 * )
 *
 * console.log(`Best provider: ${adapter.name} at ${quote.totalCost}`)
 * ```
 */
