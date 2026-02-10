/**
 * Gelato API Types
 * Type definitions for Gelato REST API integration
 *
 * @see PB-032: Gelato Integration
 * @see https://www.gelato.com/docs/api/
 */

/**
 * Gelato API configuration
 */
export interface GelatoConfig {
  apiKey: string
  environment: 'sandbox' | 'production'
  baseUrl?: string
}

/**
 * Gelato order status
 */
export type GelatoOrderStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'printing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'on_hold'
  | 'error'

/**
 * Gelato shipment status
 */
export type GelatoShipmentStatus =
  | 'not_shipped'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'returned'

/**
 * Gelato product SKU
 */
export interface GelatoProduct {
  uid: string
  title: string
  description: string
  productType: string
  availableSizes: string[]
  availableBindings: string[]
  minPages: number
  maxPages: number
  pricing: {
    baseCost: number
    currency: 'USD' | 'EUR' | 'GBP'
  }
}

/**
 * Gelato order item
 */
export interface GelatoOrderItem {
  productUid: string
  quantity: number
  files: GelatoFile[]
  options?: Record<string, string>
}

/**
 * Gelato file (PDF or image)
 */
export interface GelatoFile {
  type: 'cover' | 'content' | 'back'
  url: string
  md5?: string
}

/**
 * Gelato shipping address
 */
export interface GelatoAddress {
  firstName: string
  lastName: string
  companyName?: string
  addressLine1: string
  addressLine2?: string
  city: string
  postCode: string
  country: string // ISO 3166-1 alpha-2
  state?: string
  email?: string
  phone?: string
}

/**
 * Gelato order request
 */
export interface GelatoOrderRequest {
  orderReferenceId: string // Your internal order ID
  customerReferenceId?: string
  shippingMethod: 'standard' | 'express' | 'priority'
  recipientAddress: GelatoAddress
  orderItems: GelatoOrderItem[]
  returnAddress?: GelatoAddress
  metadata?: Record<string, any>
}

/**
 * Gelato order response
 */
export interface GelatoOrder {
  id: string
  orderReferenceId: string
  status: GelatoOrderStatus
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  shippingMethod: string
  recipientAddress: GelatoAddress
  orderItems: GelatoOrderItem[]
  costs: GelatoCosts
  shipments: GelatoShipment[]
  metadata?: Record<string, any>
}

/**
 * Gelato order costs
 */
export interface GelatoCosts {
  currency: string
  totalCost: number
  itemsCost: number
  shippingCost: number
  taxCost?: number
}

/**
 * Gelato shipment
 */
export interface GelatoShipment {
  id: string
  status: GelatoShipmentStatus
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
  shippedAt?: string
  estimatedDeliveryDate?: string
  deliveredAt?: string
}

/**
 * Gelato quote request
 */
export interface GelatoQuoteRequest {
  shippingMethod: string
  destinationCountry: string
  items: Array<{
    productUid: string
    quantity: number
  }>
}

/**
 * Gelato quote response
 */
export interface GelatoQuote {
  currency: string
  totalCost: number
  itemsCost: number
  shippingCost: number
  estimatedProductionTime: number // days
  estimatedShippingTime: number // days
}

/**
 * Gelato error response
 */
export interface GelatoError {
  code: string
  message: string
  details?: any
  errors?: Array<{
    field: string
    message: string
  }>
}

/**
 * Gelato webhook event
 */
export interface GelatoWebhookEvent {
  eventType: 'order.created' | 'order.updated' | 'order.shipped' | 'order.delivered' | 'order.cancelled'
  orderId: string
  orderReferenceId: string
  timestamp: string
  data: GelatoOrder
}
