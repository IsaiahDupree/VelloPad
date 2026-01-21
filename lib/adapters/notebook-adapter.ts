/**
 * Notebook Adapter Interface
 * Base interface for product mode adapters (cover-only vs custom interior)
 */

import type { StockInterior } from '@/lib/interiors/stock-library'

/**
 * Product capabilities define what a product mode supports
 */
export interface ProductCapabilities {
  // Cover customization
  supportsCoverDesign: boolean
  supportsCustomCoverImage: boolean
  supportsTextOnCover: boolean

  // Interior options
  supportsCoverOnly: boolean          // Uses stock interior PDF
  supportsCustomInterior: boolean     // User edits pages
  supportsBlankInterior: boolean      // Blank pages only

  // Binding options
  supportedBindings: BindingType[]
  supportsSpiral: boolean
  supportsLayflat: boolean

  // Page specifications
  allowedPageSizes: PageSize[]
  allowedPageCounts: number[] | { min: number, max: number }
  allowedPaperTypes: PaperType[]

  // Quality requirements
  minimumDPI: number
  requiresBleed: boolean
  requiresPrintReadyPDF: boolean

  // Provider integration
  compatibleProviders: string[]  // 'prodigi', 'gelato', 'lulu', etc.
}

/**
 * Binding types
 */
export type BindingType = 'perfect_bound' | 'saddle_stitch' | 'spiral' | 'coil' | 'wire-o' | 'layflat' | 'hardcover'

/**
 * Page sizes
 */
export type PageSize = '5x8' | '5.5x8.5' | '6x9' | '7x10' | '8x10' | '8.5x11' | 'A4' | 'A5'

/**
 * Paper types
 */
export type PaperType = 'standard-white' | 'cream' | 'premium-white' | 'recycled' | 'heavyweight'

/**
 * Asset requirements for the product
 */
export interface AssetRequirements {
  // Cover assets
  coverImage?: {
    required: boolean
    minWidth: number
    minHeight: number
    minDPI: number
    acceptedFormats: string[]
  }

  // Interior assets
  interiorImages?: {
    required: boolean
    maxCount: number
    minDPI: number
    acceptedFormats: string[]
  }

  // Stock interior PDF (for cover-only mode)
  stockInterior?: {
    required: boolean
    source: 'stock-library' | 'upload' | 'generate'
  }
}

/**
 * Product specification for ordering
 */
export interface ProductSpec {
  // Product type
  productMode: 'cover-only' | 'custom-interior' | 'blank'

  // Physical specs
  pageSize: PageSize
  bindingType: BindingType
  pageCount: number
  paperType: PaperType

  // Cover design
  coverDesign: {
    frontImage?: string  // URL to cover image
    backImage?: string   // URL to back cover image
    spineImage?: string  // URL to spine image
    title?: string
    subtitle?: string
    author?: string
    colors?: {
      background?: string
      text?: string
      accent?: string
    }
  }

  // Interior content
  interior: {
    type: 'stock' | 'custom' | 'blank'
    stockInteriorId?: string  // If using stock interior
    customContent?: any       // Custom page content/layout
    bleedMargin?: string
    safeZoneMargin?: string
  }

  // Print specifications
  printSpec: {
    colorMode: 'color' | 'bw' | 'grayscale'
    finish: 'matte' | 'glossy' | 'uncoated'
    lamination?: 'gloss' | 'matte' | 'soft-touch'
  }
}

/**
 * Quote request for pricing
 */
export interface QuoteRequest {
  productSpec: ProductSpec
  quantity: number
  shippingAddress: {
    country: string
    postalCode: string
  }
  shippingMethod?: 'standard' | 'express' | 'economy'
}

/**
 * Quote response with pricing
 */
export interface QuoteResponse {
  provider: string
  quoteId: string
  productionCost: number
  shippingCost: number
  totalCost: number
  currency: string
  estimatedProductionDays: number
  estimatedShippingDays: number
  validUntil: string  // ISO date
  metadata?: Record<string, any>
}

/**
 * Order request
 */
export interface CreateOrderRequest {
  productSpec: ProductSpec
  quantity: number
  shippingAddress: {
    name: string
    line1: string
    line2?: string
    city: string
    state?: string
    postalCode: string
    country: string
    phone?: string
  }
  shippingMethod: 'standard' | 'express' | 'economy'
  assets: {
    coverPdfUrl: string
    interiorPdfUrl: string
  }
  metadata?: Record<string, any>
}

/**
 * Order response
 */
export interface CreateOrderResponse {
  provider: string
  providerOrderId: string
  orderId: string  // Our internal order ID
  status: OrderStatus
  estimatedDeliveryDate?: string
  trackingNumber?: string
  metadata?: Record<string, any>
}

/**
 * Order status
 */
export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'printing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'error'

/**
 * Order status update
 */
export interface OrderStatusUpdate {
  orderId: string
  status: OrderStatus
  trackingNumber?: string
  estimatedDeliveryDate?: string
  metadata?: Record<string, any>
}

/**
 * Preflight check result
 */
export interface PreflightResult {
  passed: boolean
  errors: PreflightIssue[]
  warnings: PreflightIssue[]
  checks: {
    coverPdf: CheckResult
    interiorPdf: CheckResult
    specifications: CheckResult
    assets: CheckResult
  }
}

export interface PreflightIssue {
  code: string
  severity: 'error' | 'warning'
  message: string
  location?: string
  suggestion?: string
}

export interface CheckResult {
  passed: boolean
  issues: PreflightIssue[]
}

/**
 * Base Notebook Adapter Interface
 * All product mode adapters must implement this interface
 */
export interface NotebookAdapter {
  // Adapter identification
  readonly name: string
  readonly version: string
  readonly productMode: 'cover-only' | 'custom-interior' | 'blank'

  // Capabilities
  getCapabilities(): ProductCapabilities
  getAssetRequirements(): AssetRequirements

  // Validation
  validateSpec(spec: ProductSpec): { valid: boolean, errors: string[] }
  preflight(spec: ProductSpec, assets: { coverPdfUrl: string, interiorPdfUrl: string }): Promise<PreflightResult>

  // Pricing
  getQuote(request: QuoteRequest): Promise<QuoteResponse>

  // Ordering
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>

  // Status tracking
  getOrderStatus(providerOrderId: string): Promise<OrderStatusUpdate>

  // Utility methods
  generateInteriorPdf?(content: any): Promise<string>  // Optional: for custom interior mode
  getStockInterior?(interiorId: string): StockInterior | null  // Optional: for cover-only mode
}

/**
 * Helper function to validate product spec against capabilities
 */
export function validateProductSpec(
  spec: ProductSpec,
  capabilities: ProductCapabilities
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  // Check page size
  if (!capabilities.allowedPageSizes.includes(spec.pageSize)) {
    errors.push(`Page size ${spec.pageSize} is not supported`)
  }

  // Check binding
  if (!capabilities.supportedBindings.includes(spec.bindingType)) {
    errors.push(`Binding type ${spec.bindingType} is not supported`)
  }

  // Check page count
  if (Array.isArray(capabilities.allowedPageCounts)) {
    if (!capabilities.allowedPageCounts.includes(spec.pageCount)) {
      errors.push(`Page count ${spec.pageCount} is not allowed`)
    }
  } else {
    const { min, max } = capabilities.allowedPageCounts
    if (spec.pageCount < min || spec.pageCount > max) {
      errors.push(`Page count must be between ${min} and ${max}`)
    }
  }

  // Check paper type
  if (!capabilities.allowedPaperTypes.includes(spec.paperType)) {
    errors.push(`Paper type ${spec.paperType} is not supported`)
  }

  // Check cover-only mode
  if (spec.interior.type === 'stock' && !capabilities.supportsCoverOnly) {
    errors.push('Cover-only mode is not supported')
  }

  // Check custom interior
  if (spec.interior.type === 'custom' && !capabilities.supportsCustomInterior) {
    errors.push('Custom interior is not supported')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Base adapter class that can be extended
 */
export abstract class BaseNotebookAdapter implements NotebookAdapter {
  abstract readonly name: string
  abstract readonly version: string
  abstract readonly productMode: 'cover-only' | 'custom-interior' | 'blank'

  abstract getCapabilities(): ProductCapabilities
  abstract getAssetRequirements(): AssetRequirements
  abstract getQuote(request: QuoteRequest): Promise<QuoteResponse>
  abstract createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>
  abstract getOrderStatus(providerOrderId: string): Promise<OrderStatusUpdate>

  validateSpec(spec: ProductSpec): { valid: boolean, errors: string[] } {
    return validateProductSpec(spec, this.getCapabilities())
  }

  async preflight(
    spec: ProductSpec,
    assets: { coverPdfUrl: string, interiorPdfUrl: string }
  ): Promise<PreflightResult> {
    const errors: PreflightIssue[] = []
    const warnings: PreflightIssue[] = []

    // Validate spec
    const specValidation = this.validateSpec(spec)
    if (!specValidation.valid) {
      specValidation.errors.forEach(error => {
        errors.push({
          code: 'SPEC_VALIDATION_FAILED',
          severity: 'error',
          message: error
        })
      })
    }

    // Basic asset checks (override in subclass for detailed checks)
    const coverPdfCheck: CheckResult = {
      passed: !!assets.coverPdfUrl,
      issues: assets.coverPdfUrl ? [] : [{
        code: 'COVER_PDF_MISSING',
        severity: 'error',
        message: 'Cover PDF is required'
      }]
    }

    const interiorPdfCheck: CheckResult = {
      passed: !!assets.interiorPdfUrl,
      issues: assets.interiorPdfUrl ? [] : [{
        code: 'INTERIOR_PDF_MISSING',
        severity: 'error',
        message: 'Interior PDF is required'
      }]
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      checks: {
        coverPdf: coverPdfCheck,
        interiorPdf: interiorPdfCheck,
        specifications: {
          passed: specValidation.valid,
          issues: specValidation.errors.map(e => ({
            code: 'SPEC_ERROR',
            severity: 'error' as const,
            message: e
          }))
        },
        assets: {
          passed: true,
          issues: []
        }
      }
    }
  }
}
