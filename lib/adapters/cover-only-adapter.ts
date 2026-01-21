/**
 * Cover-Only Notebook Adapter
 * Product mode B: User customizes cover, uses pre-approved stock interior PDF
 *
 * Feature: PM-002 - Cover-Only Notebook Adapter
 */

import {
  BaseNotebookAdapter,
  type ProductCapabilities,
  type AssetRequirements,
  type QuoteRequest,
  type QuoteResponse,
  type CreateOrderRequest,
  type CreateOrderResponse,
  type OrderStatusUpdate,
  type PreflightResult,
  type PreflightIssue,
  type ProductSpec
} from './notebook-adapter'
import {
  getStockInteriorById,
  type StockInterior
} from '@/lib/interiors/stock-library'
import { COVER_ONLY_CAPABILITIES } from './capabilities'

/**
 * Cover-Only Adapter Configuration
 */
export interface CoverOnlyAdapterConfig {
  // Default provider for quotes and orders
  defaultProvider?: 'prodigi' | 'gelato' | 'lulu' | 'peecho'

  // Pricing configuration
  pricing?: {
    coverCostBase: number        // Base cost for cover printing
    stockInteriorMultiplier: number  // Multiplier per page for stock interior
    bindingCosts: Record<string, number>  // Additional binding costs
  }

  // Quality settings
  quality?: {
    minCoverDPI: number
    requiresBleed: boolean
    coverFileTypes: string[]
  }
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<CoverOnlyAdapterConfig> = {
  defaultProvider: 'prodigi',
  pricing: {
    coverCostBase: 2.50,
    stockInteriorMultiplier: 0.025,
    bindingCosts: {
      'perfect_bound': 0.50,
      'saddle_stitch': 0.30,
      'spiral': 0.75,
      'coil': 0.75,
      'wire-o': 0.80,
      'layflat': 1.50,
      'hardcover': 3.00
    }
  },
  quality: {
    minCoverDPI: 300,
    requiresBleed: true,
    coverFileTypes: ['pdf', 'jpg', 'png', 'tiff']
  }
}

/**
 * Cover-Only Notebook Adapter
 * Handles notebooks where users customize covers but use stock interiors
 */
export class CoverOnlyAdapter extends BaseNotebookAdapter {
  readonly name = 'cover-only'
  readonly version = '1.0.0'
  readonly productMode = 'cover-only' as const

  private config: Required<CoverOnlyAdapterConfig>

  constructor(config?: CoverOnlyAdapterConfig) {
    super()
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      pricing: {
        ...DEFAULT_CONFIG.pricing,
        ...config?.pricing
      },
      quality: {
        ...DEFAULT_CONFIG.quality,
        ...config?.quality
      }
    }
  }

  /**
   * Get capabilities for cover-only mode
   */
  getCapabilities(): ProductCapabilities {
    return COVER_ONLY_CAPABILITIES
  }

  /**
   * Get asset requirements for cover-only mode
   */
  getAssetRequirements(): AssetRequirements {
    return {
      // Cover assets
      coverImage: {
        required: true,
        minWidth: 2550,  // For 6x9 @ 300 DPI
        minHeight: 3300,
        minDPI: this.config.quality.minCoverDPI,
        acceptedFormats: this.config.quality.coverFileTypes
      },

      // Interior assets not required - using stock interior
      interiorImages: {
        required: false,
        maxCount: 0,
        minDPI: 0,
        acceptedFormats: []
      },

      // Stock interior is required
      stockInterior: {
        required: true,
        source: 'stock-library'
      }
    }
  }

  /**
   * Get stock interior for this product
   */
  getStockInterior(interiorId: string): StockInterior | null {
    return getStockInteriorById(interiorId) || null
  }

  /**
   * Validate product specification
   */
  override validateSpec(spec: ProductSpec): { valid: boolean; errors: string[] } {
    const baseValidation = super.validateSpec(spec)
    const errors = [...baseValidation.errors]

    // Ensure interior type is 'stock'
    if (spec.interior.type !== 'stock') {
      errors.push('Cover-only mode requires interior type to be "stock"')
    }

    // Ensure stock interior ID is provided
    if (!spec.interior.stockInteriorId) {
      errors.push('Stock interior ID is required for cover-only mode')
    } else {
      // Validate stock interior exists
      const stockInterior = this.getStockInterior(spec.interior.stockInteriorId)
      if (!stockInterior) {
        errors.push(`Stock interior "${spec.interior.stockInteriorId}" not found`)
      } else {
        // Validate page size matches
        if (stockInterior.pageSize !== spec.pageSize) {
          errors.push(
            `Stock interior page size (${stockInterior.pageSize}) does not match spec page size (${spec.pageSize})`
          )
        }

        // Validate page count matches
        if (stockInterior.pageCount !== spec.pageCount) {
          errors.push(
            `Stock interior page count (${stockInterior.pageCount}) does not match spec page count (${spec.pageCount})`
          )
        }

        // Ensure stock interior is print-ready
        if (!stockInterior.printReady) {
          errors.push(`Stock interior "${spec.interior.stockInteriorId}" is not marked as print-ready`)
        }
      }
    }

    // Cover design validation
    if (!spec.coverDesign.frontImage) {
      errors.push('Front cover image is required for cover-only mode')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Enhanced preflight checks for cover-only mode
   */
  override async preflight(
    spec: ProductSpec,
    assets: { coverPdfUrl: string; interiorPdfUrl: string }
  ): Promise<PreflightResult> {
    const baseResult = await super.preflight(spec, assets)
    const errors: PreflightIssue[] = [...baseResult.errors]
    const warnings: PreflightIssue[] = [...baseResult.warnings]

    // Validate stock interior
    if (spec.interior.stockInteriorId) {
      const stockInterior = this.getStockInterior(spec.interior.stockInteriorId)

      if (!stockInterior) {
        errors.push({
          code: 'STOCK_INTERIOR_NOT_FOUND',
          severity: 'error',
          message: `Stock interior "${spec.interior.stockInteriorId}" not found in library`
        })
      } else {
        // Check if stock interior PDF exists
        if (!stockInterior.pdfUrl) {
          errors.push({
            code: 'STOCK_INTERIOR_PDF_MISSING',
            severity: 'error',
            message: 'Stock interior PDF URL is not available',
            suggestion: 'Ensure stock interior PDF has been uploaded to storage'
          })
        }

        // Check metadata requirements
        if (stockInterior.metadata.dpi < this.config.quality.minCoverDPI) {
          warnings.push({
            code: 'STOCK_INTERIOR_LOW_DPI',
            severity: 'warning',
            message: `Stock interior DPI (${stockInterior.metadata.dpi}) is below recommended (${this.config.quality.minCoverDPI})`
          })
        }

        // Check color space
        if (stockInterior.metadata.colorSpace !== 'CMYK') {
          warnings.push({
            code: 'STOCK_INTERIOR_COLORSPACE',
            severity: 'warning',
            message: `Stock interior uses ${stockInterior.metadata.colorSpace} instead of CMYK`,
            suggestion: 'CMYK color space is recommended for print'
          })
        }
      }
    }

    // Cover-specific checks
    if (!assets.coverPdfUrl) {
      errors.push({
        code: 'COVER_PDF_REQUIRED',
        severity: 'error',
        message: 'Cover PDF is required for cover-only mode'
      })
    }

    // Binding compatibility check
    if (spec.bindingType === 'spiral' || spec.bindingType === 'coil' || spec.bindingType === 'wire-o') {
      warnings.push({
        code: 'SPIRAL_BINDING_MARGINS',
        severity: 'warning',
        message: `${spec.bindingType} binding requires additional margin on binding edge`,
        suggestion: 'Ensure at least 0.5" margin on binding edge for spiral/coil binding'
      })
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      checks: {
        ...baseResult.checks,
        coverPdf: {
          passed: !!assets.coverPdfUrl,
          issues: assets.coverPdfUrl ? [] : errors.filter(e => e.code.includes('COVER'))
        },
        interiorPdf: {
          passed: true, // Stock interior is pre-validated
          issues: []
        }
      }
    }
  }

  /**
   * Get quote for cover-only notebook
   */
  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    // Validate spec
    const validation = this.validateSpec(request.productSpec)
    if (!validation.valid) {
      throw new Error(`Invalid product spec: ${validation.errors.join(', ')}`)
    }

    const { productSpec, quantity, shippingAddress } = request
    const stockInterior = this.getStockInterior(productSpec.interior.stockInteriorId!)

    if (!stockInterior) {
      throw new Error(`Stock interior not found: ${productSpec.interior.stockInteriorId}`)
    }

    // Calculate production cost
    const coverCost = this.config.pricing.coverCostBase
    const interiorCost = productSpec.pageCount * this.config.pricing.stockInteriorMultiplier
    const bindingCost = this.config.pricing.bindingCosts[productSpec.bindingType] || 0

    const unitCost = coverCost + interiorCost + bindingCost
    const productionCost = unitCost * quantity

    // Estimate shipping (simplified - would call provider API in production)
    const shippingCost = this.estimateShipping(quantity, shippingAddress.country)

    const totalCost = productionCost + shippingCost

    return {
      provider: this.config.defaultProvider,
      quoteId: `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productionCost,
      shippingCost,
      totalCost,
      currency: 'USD',
      estimatedProductionDays: 3,
      estimatedShippingDays: this.estimateShippingDays(shippingAddress.country),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      metadata: {
        productMode: 'cover-only',
        stockInteriorId: stockInterior.id,
        unitCost,
        breakdown: {
          cover: coverCost,
          interior: interiorCost,
          binding: bindingCost
        }
      }
    }
  }

  /**
   * Create order for cover-only notebook
   */
  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    // Validate spec
    const validation = this.validateSpec(request.productSpec)
    if (!validation.valid) {
      throw new Error(`Invalid product spec: ${validation.errors.join(', ')}`)
    }

    // Preflight check
    const preflightResult = await this.preflight(request.productSpec, request.assets)
    if (!preflightResult.passed) {
      throw new Error(
        `Preflight failed: ${preflightResult.errors.map(e => e.message).join(', ')}`
      )
    }

    // Get stock interior
    const stockInterior = this.getStockInterior(request.productSpec.interior.stockInteriorId!)
    if (!stockInterior) {
      throw new Error(`Stock interior not found: ${request.productSpec.interior.stockInteriorId}`)
    }

    // TODO: Call actual print provider API (Prodigi, Gelato, etc.)
    // For now, return mock response

    const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const providerOrderId = `${this.config.defaultProvider}-${Date.now()}`

    return {
      provider: this.config.defaultProvider,
      providerOrderId,
      orderId,
      status: 'pending',
      estimatedDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        productMode: 'cover-only',
        stockInteriorId: stockInterior.id,
        stockInteriorName: stockInterior.name
      }
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(providerOrderId: string): Promise<OrderStatusUpdate> {
    // TODO: Call actual print provider API
    // For now, return mock response

    return {
      orderId: providerOrderId,
      status: 'processing',
      metadata: {
        productMode: 'cover-only'
      }
    }
  }

  /**
   * Estimate shipping cost (simplified)
   */
  private estimateShipping(quantity: number, country: string): number {
    const baseRate = country === 'US' ? 3.99 : 12.99
    const perItemRate = country === 'US' ? 0.50 : 1.50

    return baseRate + (quantity - 1) * perItemRate
  }

  /**
   * Estimate shipping days
   */
  private estimateShippingDays(country: string): number {
    if (country === 'US') return 5
    if (['CA', 'MX'].includes(country)) return 7
    if (country.startsWith('EU') || ['UK', 'GB'].includes(country)) return 10
    return 14
  }
}

/**
 * Create default cover-only adapter instance
 */
export function createCoverOnlyAdapter(config?: CoverOnlyAdapterConfig): CoverOnlyAdapter {
  return new CoverOnlyAdapter(config)
}
