/**
 * Custom Interior Notebook Adapter
 * Product mode A: User edits pages (planner layouts, prompts, etc), generates print-ready interior PDF
 *
 * Feature: PM-003 - Custom Interior Notebook Adapter
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
import { CUSTOM_INTERIOR_CAPABILITIES } from './capabilities'

/**
 * Custom Interior Adapter Configuration
 */
export interface CustomInteriorAdapterConfig {
  // Default provider for quotes and orders
  defaultProvider?: 'prodigi' | 'gelato' | 'lulu' | 'peecho'

  // Pricing configuration
  pricing?: {
    coverCostBase: number        // Base cost for cover printing
    interiorCostPerPage: number  // Cost per interior page
    customLayoutMultiplier: number  // Additional cost for custom layouts
    bindingCosts: Record<string, number>  // Additional binding costs
  }

  // Quality settings
  quality?: {
    minCoverDPI: number
    minInteriorDPI: number
    requiresBleed: boolean
    coverFileTypes: string[]
    interiorFileTypes: string[]
  }

  // Feature flags
  features?: {
    enableAILayouts?: boolean
    enableTemplateImport?: boolean
    maxImagesPerPage?: number
  }
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<CustomInteriorAdapterConfig> = {
  defaultProvider: 'prodigi',
  pricing: {
    coverCostBase: 2.50,
    interiorCostPerPage: 0.05,
    customLayoutMultiplier: 1.2,  // 20% premium for custom layouts
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
    minInteriorDPI: 300,
    requiresBleed: true,
    coverFileTypes: ['pdf', 'jpg', 'png', 'tiff'],
    interiorFileTypes: ['pdf']
  },
  features: {
    enableAILayouts: true,
    enableTemplateImport: true,
    maxImagesPerPage: 10
  }
}

/**
 * Page layout definition
 */
export interface PageLayout {
  pageNumber: number
  templateId?: string
  elements: LayoutElement[]
  metadata?: {
    bleed?: number
    safeZone?: number
  }
}

/**
 * Layout element types
 */
export type LayoutElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | LineElement

export interface TextElement {
  type: 'text'
  id: string
  content: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontFamily: string
  fontWeight?: string
  color?: string
  alignment?: 'left' | 'center' | 'right' | 'justify'
  rotation?: number
}

export interface ImageElement {
  type: 'image'
  id: string
  imageUrl: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  opacity?: number
  fit?: 'cover' | 'contain' | 'fill'
}

export interface ShapeElement {
  type: 'shape'
  id: string
  shape: 'rectangle' | 'circle' | 'line'
  x: number
  y: number
  width: number
  height: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}

export interface LineElement {
  type: 'line'
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  stroke?: string
  strokeWidth?: number
}

/**
 * Custom Interior Notebook Adapter
 * Handles notebooks where users design individual pages with custom layouts
 */
export class CustomInteriorAdapter extends BaseNotebookAdapter {
  readonly name = 'custom-interior'
  readonly version = '1.0.0'
  readonly productMode = 'custom-interior' as const

  private config: Required<CustomInteriorAdapterConfig>

  constructor(config?: CustomInteriorAdapterConfig) {
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
      },
      features: {
        ...DEFAULT_CONFIG.features,
        ...config?.features
      }
    }
  }

  /**
   * Get capabilities for custom interior mode
   */
  getCapabilities(): ProductCapabilities {
    return CUSTOM_INTERIOR_CAPABILITIES
  }

  /**
   * Get asset requirements for custom interior mode
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

      // Interior images (user can add images to pages)
      interiorImages: {
        required: false,
        maxCount: this.config.features.maxImagesPerPage || 10,
        minDPI: this.config.quality.minInteriorDPI,
        acceptedFormats: ['jpg', 'png', 'tiff']
      },

      // Custom interior PDF will be generated
      stockInterior: {
        required: false,
        source: 'generate'
      }
    }
  }

  /**
   * Validate product specification
   */
  override validateSpec(spec: ProductSpec): { valid: boolean; errors: string[] } {
    const baseValidation = super.validateSpec(spec)
    const errors = [...baseValidation.errors]

    // Ensure interior type is 'custom' or 'blank'
    if (spec.interior.type !== 'custom' && spec.interior.type !== 'blank') {
      errors.push('Custom interior mode requires interior type to be "custom" or "blank"')
    }

    // If custom interior, validate custom content
    if (spec.interior.type === 'custom') {
      if (!spec.interior.customContent) {
        errors.push('Custom content is required for custom interior mode')
      } else {
        // Validate custom content structure
        const contentErrors = this.validateCustomContent(spec.interior.customContent)
        errors.push(...contentErrors)
      }
    }

    // Cover design validation
    if (!spec.coverDesign.frontImage) {
      errors.push('Front cover image is required')
    }

    // Page count validation for binding type
    if (spec.bindingType === 'saddle_stitch' && spec.pageCount > 80) {
      errors.push('Saddle stitch binding supports maximum 80 pages')
    }

    if (spec.bindingType === 'perfect_bound' && spec.pageCount < 24) {
      errors.push('Perfect bound requires minimum 24 pages')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate custom content structure
   */
  private validateCustomContent(customContent: any): string[] {
    const errors: string[] = []

    // Check if content has pages
    if (!customContent.pages || !Array.isArray(customContent.pages)) {
      errors.push('Custom content must include a pages array')
      return errors
    }

    // Validate each page
    customContent.pages.forEach((page: any, index: number) => {
      if (typeof page.pageNumber !== 'number') {
        errors.push(`Page ${index}: pageNumber is required and must be a number`)
      }

      if (page.elements && !Array.isArray(page.elements)) {
        errors.push(`Page ${index}: elements must be an array`)
      }

      // Validate elements
      if (page.elements) {
        page.elements.forEach((element: any, elemIndex: number) => {
          if (!element.type) {
            errors.push(`Page ${index}, Element ${elemIndex}: type is required`)
          }

          if (!element.id) {
            errors.push(`Page ${index}, Element ${elemIndex}: id is required`)
          }

          // Type-specific validation
          if (element.type === 'text' && !element.content) {
            errors.push(`Page ${index}, Element ${elemIndex}: text content is required`)
          }

          if (element.type === 'image' && !element.imageUrl) {
            errors.push(`Page ${index}, Element ${elemIndex}: imageUrl is required for image elements`)
          }
        })
      }
    })

    // Check for image count limits
    if (this.config.features.maxImagesPerPage) {
      customContent.pages.forEach((page: any, index: number) => {
        const imageCount = page.elements?.filter((e: any) => e.type === 'image').length || 0
        if (imageCount > this.config.features.maxImagesPerPage!) {
          errors.push(`Page ${index}: exceeds maximum ${this.config.features.maxImagesPerPage} images per page`)
        }
      })
    }

    return errors
  }

  /**
   * Enhanced preflight checks for custom interior mode
   */
  override async preflight(
    spec: ProductSpec,
    assets: { coverPdfUrl: string; interiorPdfUrl: string }
  ): Promise<PreflightResult> {
    const baseResult = await super.preflight(spec, assets)
    const errors: PreflightIssue[] = [...baseResult.errors]
    const warnings: PreflightIssue[] = [...baseResult.warnings]

    // Validate custom interior content
    if (spec.interior.type === 'custom' && spec.interior.customContent) {
      // Check page count matches
      const declaredPageCount = spec.pageCount
      const actualPageCount = spec.interior.customContent.pages?.length || 0

      if (actualPageCount !== declaredPageCount) {
        errors.push({
          code: 'PAGE_COUNT_MISMATCH',
          severity: 'error',
          message: `Page count mismatch: spec declares ${declaredPageCount} pages but content has ${actualPageCount} pages`
        })
      }

      // Check for missing page numbers
      const pageNumbers = spec.interior.customContent.pages?.map((p: any) => p.pageNumber) || []
      const sortedPages = [...pageNumbers].sort((a, b) => a - b)
      const expectedPages = Array.from({ length: declaredPageCount }, (_, i) => i + 1)

      const missingPages = expectedPages.filter(p => !pageNumbers.includes(p))
      if (missingPages.length > 0) {
        errors.push({
          code: 'MISSING_PAGES',
          severity: 'error',
          message: `Missing page numbers: ${missingPages.join(', ')}`,
          suggestion: 'Ensure all pages from 1 to pageCount are defined'
        })
      }

      // Check for duplicate page numbers
      const duplicates = pageNumbers.filter((num, index) => pageNumbers.indexOf(num) !== index)
      if (duplicates.length > 0) {
        errors.push({
          code: 'DUPLICATE_PAGES',
          severity: 'error',
          message: `Duplicate page numbers found: ${[...new Set(duplicates)].join(', ')}`
        })
      }

      // Validate bleed and safe zones
      spec.interior.customContent.pages?.forEach((page: any) => {
        page.elements?.forEach((element: any) => {
          // Check if elements are within safe zone
          const safeZoneMargin = page.metadata?.safeZone || 6 // 6mm default
          if (element.x < safeZoneMargin || element.y < safeZoneMargin) {
            warnings.push({
              code: 'ELEMENT_OUTSIDE_SAFE_ZONE',
              severity: 'warning',
              message: `Page ${page.pageNumber}: Element "${element.id}" may be outside safe zone`,
              location: `Page ${page.pageNumber}`,
              suggestion: 'Ensure important content stays within safe zones'
            })
          }

          // Check image DPI
          if (element.type === 'image') {
            warnings.push({
              code: 'IMAGE_DPI_CHECK',
              severity: 'warning',
              message: `Page ${page.pageNumber}: Verify image "${element.id}" meets ${this.config.quality.minInteriorDPI} DPI requirement`,
              location: `Page ${page.pageNumber}`
            })
          }
        })
      })
    }

    // Check interior PDF
    if (!assets.interiorPdfUrl) {
      errors.push({
        code: 'INTERIOR_PDF_REQUIRED',
        severity: 'error',
        message: 'Interior PDF is required for custom interior mode',
        suggestion: 'Generate interior PDF from custom content before ordering'
      })
    }

    // Binding compatibility check
    if (spec.bindingType === 'spiral' || spec.bindingType === 'coil' || spec.bindingType === 'wire-o') {
      warnings.push({
        code: 'SPIRAL_BINDING_MARGINS',
        severity: 'warning',
        message: `${spec.bindingType} binding requires additional margin on binding edge`,
        suggestion: 'Ensure at least 0.5" margin on binding edge for spiral/coil/wire-o binding'
      })
    }

    if (spec.bindingType === 'layflat') {
      warnings.push({
        code: 'LAYFLAT_SPINE_GAP',
        severity: 'warning',
        message: 'Layflat binding: account for spine gap in spreads',
        suggestion: 'Leave 0.25" gap in the center of two-page spreads'
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
          passed: !!assets.interiorPdfUrl,
          issues: assets.interiorPdfUrl ? [] : errors.filter(e => e.code.includes('INTERIOR'))
        }
      }
    }
  }

  /**
   * Get quote for custom interior notebook
   */
  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    // Validate spec
    const validation = this.validateSpec(request.productSpec)
    if (!validation.valid) {
      throw new Error(`Invalid product spec: ${validation.errors.join(', ')}`)
    }

    const { productSpec, quantity, shippingAddress } = request

    // Calculate production cost
    const coverCost = this.config.pricing.coverCostBase
    const baseInteriorCost = productSpec.pageCount * this.config.pricing.interiorCostPerPage

    // Apply custom layout multiplier if using custom interior
    const interiorCost = productSpec.interior.type === 'custom'
      ? baseInteriorCost * this.config.pricing.customLayoutMultiplier
      : baseInteriorCost

    const bindingCost = this.config.pricing.bindingCosts[productSpec.bindingType] || 0

    const unitCost = coverCost + interiorCost + bindingCost
    const productionCost = unitCost * quantity

    // Estimate shipping
    const shippingCost = this.estimateShipping(quantity, shippingAddress.country)

    const totalCost = productionCost + shippingCost

    return {
      provider: this.config.defaultProvider,
      quoteId: `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productionCost,
      shippingCost,
      totalCost,
      currency: 'USD',
      estimatedProductionDays: 5, // Custom interiors take longer
      estimatedShippingDays: this.estimateShippingDays(shippingAddress.country),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      metadata: {
        productMode: 'custom-interior',
        interiorType: productSpec.interior.type,
        unitCost,
        breakdown: {
          cover: coverCost,
          interior: interiorCost,
          binding: bindingCost,
          customLayoutPremium: productSpec.interior.type === 'custom'
            ? baseInteriorCost * (this.config.pricing.customLayoutMultiplier - 1)
            : 0
        }
      }
    }
  }

  /**
   * Create order for custom interior notebook
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

    // Ensure interior PDF exists (must be generated before ordering)
    if (!request.assets.interiorPdfUrl) {
      throw new Error('Interior PDF must be generated before creating order')
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
      estimatedDeliveryDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        productMode: 'custom-interior',
        interiorType: request.productSpec.interior.type,
        pageCount: request.productSpec.pageCount
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
        productMode: 'custom-interior'
      }
    }
  }

  /**
   * Generate interior PDF from custom content
   * This would typically call a PDF rendering service
   */
  async generateInteriorPdf(content: any): Promise<string> {
    // TODO: Implement actual PDF generation
    // This would integrate with the Interior PDF Render Service (PM-005)

    throw new Error('Interior PDF generation not yet implemented. See PM-005: Interior PDF Render Service')
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
 * Create default custom interior adapter instance
 */
export function createCustomInteriorAdapter(config?: CustomInteriorAdapterConfig): CustomInteriorAdapter {
  return new CustomInteriorAdapter(config)
}
