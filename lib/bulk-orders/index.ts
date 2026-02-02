/**
 * Bulk Ordering System
 * Feature: PB-040
 *
 * Order multiple copies with volume discounts
 * Supports tiered pricing, multiple shipping addresses, and group ordering
 */

import type { PrintSpec, ShippingAddress } from '@/lib/print/orchestrator'

/**
 * Volume discount tier
 */
export interface VolumeTier {
  minQuantity: number
  maxQuantity?: number // undefined = no maximum
  discountPercent: number // 0-100
  discountType: 'percentage' | 'fixed_amount' | 'unit_price'
  discountAmount?: number // For fixed_amount or unit_price types
  label: string // e.g., "Small Batch", "Standard", "Bulk"
}

/**
 * Default volume discount tiers
 */
export const DEFAULT_VOLUME_TIERS: VolumeTier[] = [
  {
    minQuantity: 1,
    maxQuantity: 24,
    discountPercent: 0,
    discountType: 'percentage',
    label: 'Small Batch',
  },
  {
    minQuantity: 25,
    maxQuantity: 99,
    discountPercent: 10,
    discountType: 'percentage',
    label: 'Standard',
  },
  {
    minQuantity: 100,
    maxQuantity: 499,
    discountPercent: 15,
    discountType: 'percentage',
    label: 'Bulk',
  },
  {
    minQuantity: 500,
    discountPercent: 20,
    discountType: 'percentage',
    label: 'Volume',
  },
]

/**
 * Bulk order item
 * Represents a single product in a bulk order (can have multiple shipping destinations)
 */
export interface BulkOrderItem {
  id: string
  spec: PrintSpec
  quantity: number
  unitPrice: number
  subtotal: number
  discount: number
  total: number
  appliedTier?: VolumeTier
}

/**
 * Bulk order shipment
 * Represents a shipment to a specific address (part of the total order)
 */
export interface BulkShipment {
  id: string
  orderItemId: string // Links to BulkOrderItem
  shippingAddress: ShippingAddress
  quantity: number
  shippingCost: number
  estimatedDeliveryDays: number
  trackingNumber?: string
  trackingUrl?: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered'
}

/**
 * Bulk order
 */
export interface BulkOrder {
  id: string
  userId: string
  workspaceId?: string

  // Order items
  items: BulkOrderItem[]
  shipments: BulkShipment[]

  // Totals
  subtotal: number
  discount: number
  shippingTotal: number
  taxTotal: number
  total: number

  // Payment
  currency: string
  paymentIntentId?: string
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'

  // Status
  orderStatus: 'draft' | 'submitted' | 'processing' | 'completed' | 'cancelled'

  // Metadata
  referenceId?: string
  notes?: string
  metadata?: Record<string, any>

  // Timestamps
  createdAt: string
  submittedAt?: string
  completedAt?: string
  updatedAt: string
}

/**
 * Bulk order request
 */
export interface CreateBulkOrderRequest {
  userId: string
  workspaceId?: string
  items: Array<{
    spec: PrintSpec
    quantity: number
    unitPrice: number
  }>
  shipments: Array<{
    orderItemIndex: number // Index in items array
    shippingAddress: ShippingAddress
    quantity: number
  }>
  referenceId?: string
  notes?: string
  metadata?: Record<string, any>
}

/**
 * Volume discount calculator
 */
export class VolumeDiscountCalculator {
  constructor(private tiers: VolumeTier[] = DEFAULT_VOLUME_TIERS) {
    // Sort tiers by quantity
    this.tiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity)
  }

  /**
   * Find applicable tier for quantity
   */
  findTier(quantity: number): VolumeTier | null {
    for (const tier of this.tiers) {
      if (
        quantity >= tier.minQuantity &&
        (tier.maxQuantity === undefined || quantity <= tier.maxQuantity)
      ) {
        return tier
      }
    }

    return null
  }

  /**
   * Calculate discount for quantity and price
   */
  calculateDiscount(quantity: number, unitPrice: number): {
    tier: VolumeTier | null
    discount: number
    discountedUnitPrice: number
    subtotal: number
    total: number
  } {
    const tier = this.findTier(quantity)
    const subtotal = unitPrice * quantity

    if (!tier) {
      return {
        tier: null,
        discount: 0,
        discountedUnitPrice: unitPrice,
        subtotal,
        total: subtotal,
      }
    }

    let discount = 0
    let discountedUnitPrice = unitPrice

    switch (tier.discountType) {
      case 'percentage':
        discount = subtotal * (tier.discountPercent / 100)
        discountedUnitPrice = unitPrice * (1 - tier.discountPercent / 100)
        break

      case 'fixed_amount':
        discount = tier.discountAmount || 0
        discountedUnitPrice = Math.max(0, (subtotal - discount) / quantity)
        break

      case 'unit_price':
        discountedUnitPrice = tier.discountAmount || unitPrice
        discount = subtotal - discountedUnitPrice * quantity
        break
    }

    return {
      tier,
      discount,
      discountedUnitPrice,
      subtotal,
      total: subtotal - discount,
    }
  }

  /**
   * Get pricing breakdown for quantity
   */
  getPricingBreakdown(quantity: number, unitPrice: number) {
    const result = this.calculateDiscount(quantity, unitPrice)

    return {
      quantity,
      originalUnitPrice: unitPrice,
      discountedUnitPrice: result.discountedUnitPrice,
      subtotal: result.subtotal,
      discount: result.discount,
      discountPercent: result.tier?.discountPercent || 0,
      total: result.total,
      savings: result.discount,
      savingsPercent: result.subtotal > 0 ? (result.discount / result.subtotal) * 100 : 0,
      tier: result.tier,
    }
  }

  /**
   * Generate quote comparison for different quantities
   */
  generateQuoteComparison(unitPrice: number, quantities: number[] = [25, 50, 100, 250, 500]) {
    return quantities.map(qty => this.getPricingBreakdown(qty, unitPrice))
  }
}

/**
 * Bulk Order Service
 */
export class BulkOrderService {
  private discountCalculator: VolumeDiscountCalculator

  constructor(tiers?: VolumeTier[]) {
    this.discountCalculator = new VolumeDiscountCalculator(tiers)
  }

  /**
   * Create bulk order
   */
  async create(request: CreateBulkOrderRequest): Promise<BulkOrder> {
    // Validate shipments
    const validation = this.validateShipments(request)
    if (!validation.valid) {
      throw new Error(`Invalid shipments: ${validation.errors.join(', ')}`)
    }

    // Calculate order items with discounts
    const items: BulkOrderItem[] = request.items.map((item, index) => {
      const discount = this.discountCalculator.calculateDiscount(item.quantity, item.unitPrice)

      return {
        id: `item-${index}-${Date.now()}`,
        spec: item.spec,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: discount.subtotal,
        discount: discount.discount,
        total: discount.total,
        appliedTier: discount.tier || undefined,
      }
    })

    // Create shipments
    const shipments: BulkShipment[] = request.shipments.map((shipment, index) => {
      const orderItem = items[shipment.orderItemIndex]
      if (!orderItem) {
        throw new Error(`Order item not found for shipment ${index}`)
      }

      // Estimate shipping cost (simplified)
      const shippingCost = this.estimateShipping(
        shipment.quantity,
        shipment.shippingAddress.country
      )

      return {
        id: `shipment-${index}-${Date.now()}`,
        orderItemId: orderItem.id,
        shippingAddress: shipment.shippingAddress,
        quantity: shipment.quantity,
        shippingCost,
        estimatedDeliveryDays: this.estimateDeliveryDays(shipment.shippingAddress.country),
        status: 'pending',
      }
    })

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const discount = items.reduce((sum, item) => sum + item.discount, 0)
    const shippingTotal = shipments.reduce((sum, shipment) => sum + shipment.shippingCost, 0)
    const taxTotal = 0 // TODO: Implement tax calculation
    const total = subtotal - discount + shippingTotal + taxTotal

    const bulkOrder: BulkOrder = {
      id: `bulk-order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: request.userId,
      workspaceId: request.workspaceId,
      items,
      shipments,
      subtotal,
      discount,
      shippingTotal,
      taxTotal,
      total,
      currency: 'USD',
      paymentStatus: 'pending',
      orderStatus: 'draft',
      referenceId: request.referenceId,
      notes: request.notes,
      metadata: request.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // TODO: Save to database

    return bulkOrder
  }

  /**
   * Get bulk order by ID
   */
  async getById(id: string): Promise<BulkOrder | null> {
    // TODO: Implement with database
    return null
  }

  /**
   * List bulk orders for user
   */
  async listForUser(userId: string): Promise<BulkOrder[]> {
    // TODO: Implement with database
    return []
  }

  /**
   * Update bulk order
   */
  async update(
    id: string,
    updates: Partial<Omit<BulkOrder, 'id' | 'createdAt'>>
  ): Promise<BulkOrder> {
    const order = await this.getById(id)
    if (!order) {
      throw new Error(`Bulk order not found: ${id}`)
    }

    // TODO: Implement with database

    return {
      ...order,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Submit bulk order for processing
   */
  async submit(id: string): Promise<BulkOrder> {
    return this.update(id, {
      orderStatus: 'submitted',
      submittedAt: new Date().toISOString(),
    })
  }

  /**
   * Cancel bulk order
   */
  async cancel(id: string): Promise<BulkOrder> {
    return this.update(id, {
      orderStatus: 'cancelled',
    })
  }

  /**
   * Validate shipments
   */
  private validateShipments(request: CreateBulkOrderRequest): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Check that shipment quantities match item quantities
    const shipmentQuantitiesByItem = new Map<number, number>()

    request.shipments.forEach((shipment, index) => {
      const currentQty = shipmentQuantitiesByItem.get(shipment.orderItemIndex) || 0
      shipmentQuantitiesByItem.set(shipment.orderItemIndex, currentQty + shipment.quantity)

      // Validate shipment quantity
      if (shipment.quantity <= 0) {
        errors.push(`Shipment ${index}: quantity must be positive`)
      }

      // Validate shipping address
      if (!shipment.shippingAddress.name) {
        errors.push(`Shipment ${index}: recipient name is required`)
      }
      if (!shipment.shippingAddress.address1) {
        errors.push(`Shipment ${index}: address is required`)
      }
      if (!shipment.shippingAddress.city) {
        errors.push(`Shipment ${index}: city is required`)
      }
      if (!shipment.shippingAddress.postalCode) {
        errors.push(`Shipment ${index}: postal code is required`)
      }
      if (!shipment.shippingAddress.country) {
        errors.push(`Shipment ${index}: country is required`)
      }
    })

    // Verify shipment totals match order item quantities
    request.items.forEach((item, index) => {
      const shipmentTotal = shipmentQuantitiesByItem.get(index) || 0
      if (shipmentTotal !== item.quantity) {
        errors.push(
          `Item ${index}: shipment quantities (${shipmentTotal}) do not match order quantity (${item.quantity})`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Estimate shipping cost (simplified)
   */
  private estimateShipping(quantity: number, country: string): number {
    const baseRate = country === 'US' ? 5.99 : 15.99
    const perItemRate = country === 'US' ? 0.25 : 0.75

    // Bulk shipping discount
    const bulkDiscount = quantity >= 100 ? 0.8 : quantity >= 50 ? 0.9 : 1.0

    return (baseRate + (quantity - 1) * perItemRate) * bulkDiscount
  }

  /**
   * Estimate delivery days
   */
  private estimateDeliveryDays(country: string): number {
    if (country === 'US') return 7
    if (['CA', 'MX'].includes(country)) return 10
    if (country.startsWith('EU') || ['UK', 'GB'].includes(country)) return 14
    return 21
  }
}

/**
 * Generate volume pricing chart
 * Useful for showing customers potential savings
 */
export function generateVolumePricingChart(
  unitPrice: number,
  quantities: number[] = [25, 50, 100, 250, 500, 1000],
  tiers?: VolumeTier[]
): Array<{
  quantity: number
  unitPrice: number
  total: number
  savings: number
  savingsPercent: number
  tier: string
}> {
  const calculator = new VolumeDiscountCalculator(tiers)

  return quantities.map(qty => {
    const breakdown = calculator.getPricingBreakdown(qty, unitPrice)

    return {
      quantity: qty,
      unitPrice: breakdown.discountedUnitPrice,
      total: breakdown.total,
      savings: breakdown.savings,
      savingsPercent: breakdown.savingsPercent,
      tier: breakdown.tier?.label || 'Standard',
    }
  })
}

/**
 * Calculate total savings from bulk order
 */
export function calculateBulkSavings(orders: BulkOrder[]): {
  totalOrders: number
  totalItems: number
  totalSubtotal: number
  totalDiscount: number
  totalPaid: number
  averageDiscountPercent: number
} {
  const totalOrders = orders.length
  const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)
  const totalSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0)
  const totalDiscount = orders.reduce((sum, o) => sum + o.discount, 0)
  const totalPaid = orders.reduce((sum, o) => sum + o.total, 0)
  const averageDiscountPercent = totalSubtotal > 0 ? (totalDiscount / totalSubtotal) * 100 : 0

  return {
    totalOrders,
    totalItems,
    totalSubtotal,
    totalDiscount,
    totalPaid,
    averageDiscountPercent,
  }
}
