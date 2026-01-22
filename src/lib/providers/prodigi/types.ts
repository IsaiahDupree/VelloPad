/**
 * Prodigi API Types
 * Type definitions for Prodigi REST API integration
 *
 * @see PB-013: Prodigi API Integration
 * @see https://www.prodigi.com/print-api/docs/reference/
 */

/**
 * Prodigi API configuration
 */
export interface ProdigiConfig {
  apiKey: string
  environment: 'sandbox' | 'production'
  baseUrl?: string
}

/**
 * Prodigi order status
 */
export type ProdigiOrderStatus =
  | 'Draft'
  | 'AwaitingPayment'
  | 'Processing'
  | 'Complete'
  | 'Cancelled'

/**
 * Prodigi shipment status
 */
export type ProdigiShipmentStatus =
  | 'NotYetShipped'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'

/**
 * Prodigi product SKU
 */
export interface ProdigiSKU {
  sku: string
  name: string
  description: string
  minPages: number
  maxPages: number
  sizes: string[]
  bindings: string[]
  baseCost: number
  currency: 'USD' | 'GBP' | 'EUR'
}

/**
 * Prodigi order item
 */
export interface ProdigiOrderItem {
  sku: string
  copies: number
  sizing?: 'fillPrintArea' | 'fitPrintArea'
  attributes?: Record<string, string>
  recipientCost?: {
    amount: number
    currency: string
  }
  assets?: ProdigiAsset[]
}

/**
 * Prodigi asset (image file)
 */
export interface ProdigiAsset {
  printArea: string // e.g., "default", "front", "back"
  url: string // Public URL to image
  md5Hash?: string
}

/**
 * Prodigi shipping address
 */
export interface ProdigiAddress {
  line1: string
  line2?: string
  postalOrZipCode: string
  countryCode: string // ISO 3166-1 alpha-2
  townOrCity: string
  stateOrCounty?: string
}

/**
 * Prodigi recipient
 */
export interface ProdigiRecipient {
  name: string
  email?: string
  phoneNumber?: string
  address: ProdigiAddress
}

/**
 * Prodigi order request
 */
export interface ProdigiOrderRequest {
  merchantReference: string // Your internal order ID
  shippingMethod: string // e.g., "Budget", "Standard", "Express"
  recipient: ProdigiRecipient
  items: ProdigiOrderItem[]
  metadata?: Record<string, string>
}

/**
 * Prodigi order response
 */
export interface ProdigiOrder {
  id: string
  created: string // ISO 8601
  lastUpdated: string // ISO 8601
  merchantReference: string
  status: {
    stage: ProdigiOrderStatus
    issues: ProdigiIssue[]
  }
  shippingMethod: string
  recipient: ProdigiRecipient
  items: ProdigiOrderItem[]
  charges: ProdigiCharges
  shipments: ProdigiShipment[]
}

/**
 * Prodigi issue/warning
 */
export interface ProdigiIssue {
  objectId: string
  errorCode: string
  description: string
  authorativeErrorCode?: string
}

/**
 * Prodigi order charges
 */
export interface ProdigiCharges {
  totalCost: {
    amount: number
    currency: string
  }
  items: {
    amount: number
    currency: string
  }
  shipping: {
    amount: number
    currency: string
  }
}

/**
 * Prodigi shipment
 */
export interface ProdigiShipment {
  id: string
  status: ProdigiShipmentStatus
  tracking?: {
    number: string
    url: string
  }
  carrier?: {
    name: string
    service: string
  }
  dispatchDate?: string
  fulfillmentLocation?: {
    countryCode: string
    labCode: string
  }
  items: Array<{
    itemId: string
    copies: number
  }>
}

/**
 * Prodigi quote request
 */
export interface ProdigiQuoteRequest {
  shippingMethod: string
  destinationCountryCode: string
  items: Array<{
    sku: string
    copies: number
  }>
}

/**
 * Prodigi quote response
 */
export interface ProdigiQuote {
  quotes: Array<{
    shippingMethod: string
    totalCost: {
      amount: number
      currency: string
    }
    items: {
      amount: number
      currency: string
    }
    shipping: {
      amount: number
      currency: string
    }
  }>
}

/**
 * Prodigi error response
 */
export interface ProdigiError {
  code: string
  message: string
  details?: any
}
