/**
 * E2E Tests for Prodigi Webhooks
 * @see PB-015: Print Order Webhooks
 */

import { test, expect } from '@playwright/test'
import {
  extractStatusUpdate,
  shouldNotifyCustomer,
  getNotificationMessage,
  validateWebhookPayload,
  parseWebhookEvent
} from '../src/lib/webhooks/prodigi'
import type { ProdigiOrder } from '../src/lib/providers/prodigi/types'

test.describe('PB-015: Print Order Webhooks', () => {
  test('should export webhook utilities', () => {
    expect(extractStatusUpdate).toBeDefined()
    expect(shouldNotifyCustomer).toBeDefined()
    expect(getNotificationMessage).toBeDefined()
    expect(validateWebhookPayload).toBeDefined()
    expect(parseWebhookEvent).toBeDefined()
  })

  test('should extract status update from order', () => {
    const mockOrder: Partial<ProdigiOrder> = {
      id: 'ord_123',
      merchantReference: 'REF-001',
      lastUpdated: '2024-01-15T10:00:00Z',
      status: {
        stage: 'Processing',
        issues: []
      },
      shipments: []
    }

    const update = extractStatusUpdate(mockOrder as ProdigiOrder)

    expect(update.orderId).toBe('ord_123')
    expect(update.merchantReference).toBe('REF-001')
    expect(update.newStatus).toBe('Processing')
    expect(update.timestamp).toBeInstanceOf(Date)
  })

  test('should extract tracking information from shipments', () => {
    const mockOrder: Partial<ProdigiOrder> = {
      id: 'ord_123',
      merchantReference: 'REF-001',
      lastUpdated: '2024-01-15T10:00:00Z',
      status: {
        stage: 'Complete',
        issues: []
      },
      shipments: [
        {
          id: 'ship_123',
          status: 'Shipped',
          tracking: {
            number: 'TRACK123',
            url: 'https://tracking.example.com/TRACK123'
          },
          items: []
        }
      ]
    }

    const update = extractStatusUpdate(mockOrder as ProdigiOrder)

    expect(update.trackingNumber).toBe('TRACK123')
    expect(update.trackingUrl).toBe('https://tracking.example.com/TRACK123')
  })

  test('should extract issues from order status', () => {
    const mockOrder: Partial<ProdigiOrder> = {
      id: 'ord_123',
      merchantReference: 'REF-001',
      lastUpdated: '2024-01-15T10:00:00Z',
      status: {
        stage: 'Processing',
        issues: [
          {
            objectId: 'ord_123',
            errorCode: 'ERR_001',
            description: 'Image DPI too low'
          }
        ]
      },
      shipments: []
    }

    const update = extractStatusUpdate(mockOrder as ProdigiOrder)

    expect(update.issues).toBeDefined()
    expect(update.issues?.length).toBe(1)
    expect(update.issues?.[0]).toBe('Image DPI too low')
  })

  test('should identify events requiring customer notification', () => {
    expect(shouldNotifyCustomer('order.submitted')).toBe(true)
    expect(shouldNotifyCustomer('order.processing')).toBe(true)
    expect(shouldNotifyCustomer('order.complete')).toBe(true)
    expect(shouldNotifyCustomer('order.cancelled')).toBe(true)
    expect(shouldNotifyCustomer('shipment.shipped')).toBe(true)
    expect(shouldNotifyCustomer('shipment.delivered')).toBe(true)

    expect(shouldNotifyCustomer('order.created')).toBe(false)
    expect(shouldNotifyCustomer('order.updated')).toBe(false)
    expect(shouldNotifyCustomer('shipment.created')).toBe(false)
  })

  test('should generate notification messages', () => {
    const update = {
      orderId: 'ord_123',
      merchantReference: 'REF-001',
      newStatus: 'Processing' as const,
      timestamp: new Date()
    }

    const submittedMsg = getNotificationMessage('order.submitted', update)
    expect(submittedMsg).toContain('REF-001')
    expect(submittedMsg).toContain('submitted')

    const processingMsg = getNotificationMessage('order.processing', update)
    expect(processingMsg).toContain('REF-001')
    expect(processingMsg).toContain('processing')

    const completeMsg = getNotificationMessage('order.complete', update)
    expect(completeMsg).toContain('REF-001')
    expect(completeMsg).toContain('complete')
  })

  test('should include tracking in shipped notification', () => {
    const update = {
      orderId: 'ord_123',
      merchantReference: 'REF-001',
      newStatus: 'Complete' as const,
      timestamp: new Date(),
      trackingNumber: 'TRACK123'
    }

    const message = getNotificationMessage('shipment.shipped', update)

    expect(message).toContain('REF-001')
    expect(message).toContain('shipped')
    expect(message).toContain('TRACK123')
  })

  test('should validate webhook payload', () => {
    const validPayload = {
      event: 'order.submitted',
      data: {
        order: { id: 'ord_123' }
      }
    }

    expect(validateWebhookPayload(validPayload)).toBe(true)

    expect(validateWebhookPayload(null)).toBe(false)
    expect(validateWebhookPayload({})).toBe(false)
    expect(validateWebhookPayload({ event: 'test' })).toBe(false)
    expect(validateWebhookPayload({ data: {} })).toBe(false)
  })

  test('should parse valid webhook events', () => {
    expect(parseWebhookEvent('order.created')).toBe('order.created')
    expect(parseWebhookEvent('order.submitted')).toBe('order.submitted')
    expect(parseWebhookEvent('order.processing')).toBe('order.processing')
    expect(parseWebhookEvent('order.complete')).toBe('order.complete')
    expect(parseWebhookEvent('shipment.shipped')).toBe('shipment.shipped')
    expect(parseWebhookEvent('shipment.delivered')).toBe('shipment.delivered')
  })

  test('should reject invalid webhook events', () => {
    expect(parseWebhookEvent('invalid.event')).toBeNull()
    expect(parseWebhookEvent('order.invalid')).toBeNull()
    expect(parseWebhookEvent('')).toBeNull()
  })

  test('webhook route should exist', async () => {
    // This test verifies the route file exists
    const routeModule = await import(
      '../src/app/api/webhooks/prodigi/route'
    ).catch(() => null)

    expect(routeModule).toBeDefined()
    expect(routeModule?.POST).toBeDefined()
    expect(routeModule?.GET).toBeDefined()
  })
})
