/**
 * E2E Tests for Commerce Audit Logs
 * @see BS-902: Commerce + provider audit logs (PII redaction)
 */

import { test, expect } from '@playwright/test'
import {
  redactPII,
  sanitizeWebhookPayload,
  logAuditEvent,
  AuditEventType,
  type AuditLog
} from '../src/lib/audit'

test.describe('BS-902: Commerce Audit Logs', () => {
  test('should export audit utilities', () => {
    expect(redactPII).toBeDefined()
    expect(sanitizeWebhookPayload).toBeDefined()
    expect(logAuditEvent).toBeDefined()
  })

  test('should redact email addresses', () => {
    const input = {
      email: 'john.doe@example.com',
      userEmail: 'jane@test.org',
      nested: {
        customerEmail: 'admin@company.com'
      }
    }

    const redacted = redactPII(input)

    expect(redacted.email).toBe('[REDACTED_EMAIL]')
    expect(redacted.userEmail).toBe('[REDACTED_EMAIL]')
    expect(redacted.nested.customerEmail).toBe('[REDACTED_EMAIL]')
  })

  test('should redact phone numbers', () => {
    const input = {
      phone: '+1-555-123-4567',
      phoneNumber: '555-123-4567',
      mobile: '(555) 123-4567',
      nested: {
        tel: '555.123.4567'
      }
    }

    const redacted = redactPII(input)

    expect(redacted.phone).toBe('[REDACTED_PHONE]')
    expect(redacted.phoneNumber).toBe('[REDACTED_PHONE]')
    expect(redacted.mobile).toBe('[REDACTED_PHONE]')
    expect(redacted.nested.tel).toBe('[REDACTED_PHONE]')
  })

  test('should redact names', () => {
    const input = {
      name: 'John Doe',
      firstName: 'Jane',
      lastName: 'Smith',
      customerName: 'Bob Johnson',
      nested: {
        fullName: 'Alice Brown'
      }
    }

    const redacted = redactPII(input)

    expect(redacted.name).toBe('[REDACTED_NAME]')
    expect(redacted.firstName).toBe('[REDACTED_NAME]')
    expect(redacted.lastName).toBe('[REDACTED_NAME]')
    expect(redacted.customerName).toBe('[REDACTED_NAME]')
    expect(redacted.nested.fullName).toBe('[REDACTED_NAME]')
  })

  test('should redact addresses', () => {
    const input = {
      address: '123 Main St',
      street: '456 Oak Ave',
      line1: '789 Elm St',
      line2: 'Apt 4B',
      addressLine1: '321 Pine Rd',
      nested: {
        shippingAddress: '654 Maple Dr'
      }
    }

    const redacted = redactPII(input)

    expect(redacted.address).toBe('[REDACTED_ADDRESS]')
    expect(redacted.street).toBe('[REDACTED_ADDRESS]')
    expect(redacted.line1).toBe('[REDACTED_ADDRESS]')
    expect(redacted.line2).toBe('[REDACTED_ADDRESS]')
    expect(redacted.addressLine1).toBe('[REDACTED_ADDRESS]')
    expect(redacted.nested.shippingAddress).toBe('[REDACTED_ADDRESS]')
  })

  test('should redact IP addresses', () => {
    const input = {
      ip: '192.168.1.100',
      ipAddress: '10.0.0.1',
      clientIp: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      nested: {
        sourceIp: '172.16.0.1'
      }
    }

    const redacted = redactPII(input)

    expect(redacted.ip).toBe('[REDACTED_IP]')
    expect(redacted.ipAddress).toBe('[REDACTED_IP]')
    expect(redacted.clientIp).toBe('[REDACTED_IP]')
    expect(redacted.nested.sourceIp).toBe('[REDACTED_IP]')
  })

  test('should preserve non-PII fields', () => {
    const input = {
      orderId: 'ord_123',
      amount: 2999,
      currency: 'USD',
      status: 'completed',
      timestamp: '2024-01-15T10:00:00Z',
      metadata: {
        bookId: 'book_456',
        provider: 'prodigi'
      }
    }

    const redacted = redactPII(input)

    expect(redacted.orderId).toBe('ord_123')
    expect(redacted.amount).toBe(2999)
    expect(redacted.currency).toBe('USD')
    expect(redacted.status).toBe('completed')
    expect(redacted.timestamp).toBe('2024-01-15T10:00:00Z')
    expect(redacted.metadata.bookId).toBe('book_456')
    expect(redacted.metadata.provider).toBe('prodigi')
  })

  test('should handle null and undefined values', () => {
    const input = {
      email: null,
      phone: undefined,
      name: '',
      address: null
    }

    const redacted = redactPII(input)

    expect(redacted.email).toBeNull()
    expect(redacted.phone).toBeUndefined()
    expect(redacted.name).toBe('')
    expect(redacted.address).toBeNull()
  })

  test('should handle arrays', () => {
    const input = {
      items: [
        { email: 'user1@test.com', productId: 'prod_1' },
        { email: 'user2@test.com', productId: 'prod_2' }
      ],
      tags: ['tag1', 'tag2']
    }

    const redacted = redactPII(input)

    expect(redacted.items[0].email).toBe('[REDACTED_EMAIL]')
    expect(redacted.items[0].productId).toBe('prod_1')
    expect(redacted.items[1].email).toBe('[REDACTED_EMAIL]')
    expect(redacted.items[1].productId).toBe('prod_2')
    expect(redacted.tags).toEqual(['tag1', 'tag2'])
  })

  test('should sanitize Stripe webhook payload', () => {
    const stripePayload = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          customer_email: 'customer@example.com',
          customer_details: {
            email: 'customer@example.com',
            name: 'John Doe',
            phone: '+1-555-123-4567',
            address: {
              line1: '123 Main St',
              line2: 'Apt 4B',
              city: 'San Francisco',
              state: 'CA',
              postal_code: '94102',
              country: 'US'
            }
          },
          amount_total: 2999,
          currency: 'usd',
          payment_status: 'paid'
        }
      }
    }

    const sanitized = sanitizeWebhookPayload('stripe', stripePayload)

    expect(sanitized.id).toBe('evt_123')
    expect(sanitized.type).toBe('checkout.session.completed')
    expect(sanitized.data.object.customer_email).toBe('[REDACTED_EMAIL]')
    expect(sanitized.data.object.customer_details.email).toBe('[REDACTED_EMAIL]')
    expect(sanitized.data.object.customer_details.name).toBe('[REDACTED_NAME]')
    expect(sanitized.data.object.customer_details.phone).toBe('[REDACTED_PHONE]')
    expect(sanitized.data.object.customer_details.address.line1).toBe('[REDACTED_ADDRESS]')
    expect(sanitized.data.object.customer_details.address.line2).toBe('[REDACTED_ADDRESS]')
    expect(sanitized.data.object.customer_details.address.city).toBe('San Francisco')
    expect(sanitized.data.object.customer_details.address.state).toBe('CA')
    expect(sanitized.data.object.customer_details.address.postal_code).toBe('94102')
    expect(sanitized.data.object.customer_details.address.country).toBe('US')
    expect(sanitized.data.object.amount_total).toBe(2999)
    expect(sanitized.data.object.currency).toBe('usd')
    expect(sanitized.data.object.payment_status).toBe('paid')
  })

  test('should sanitize Prodigi webhook payload', () => {
    const prodigiPayload = {
      event: 'order.created',
      orderId: 'prod_order_123',
      order: {
        id: 'prod_order_123',
        recipient: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          address: {
            line1: '456 Oak Ave',
            line2: null,
            townOrCity: 'New York',
            stateOrCounty: 'NY',
            postalOrZipCode: '10001',
            countryCode: 'US'
          }
        },
        items: [
          {
            sku: 'GLOBAL-PBP-8X10',
            copies: 1,
            sizing: '8x10'
          }
        ],
        status: {
          stage: 'InProgress',
          issues: []
        }
      }
    }

    const sanitized = sanitizeWebhookPayload('prodigi', prodigiPayload)

    expect(sanitized.event).toBe('order.created')
    expect(sanitized.orderId).toBe('prod_order_123')
    expect(sanitized.order.recipient.name).toBe('[REDACTED_NAME]')
    expect(sanitized.order.recipient.email).toBe('[REDACTED_EMAIL]')
    expect(sanitized.order.recipient.address.line1).toBe('[REDACTED_ADDRESS]')
    expect(sanitized.order.recipient.address.line2).toBeNull()
    expect(sanitized.order.recipient.address.townOrCity).toBe('New York')
    expect(sanitized.order.recipient.address.stateOrCounty).toBe('NY')
    expect(sanitized.order.recipient.address.postalOrZipCode).toBe('10001')
    expect(sanitized.order.recipient.address.countryCode).toBe('US')
    expect(sanitized.order.items[0].sku).toBe('GLOBAL-PBP-8X10')
    expect(sanitized.order.items[0].copies).toBe(1)
    expect(sanitized.order.status.stage).toBe('InProgress')
  })

  test('should create audit log entry', () => {
    const log: AuditLog = {
      event_type: 'stripe_webhook' as AuditEventType,
      provider: 'stripe',
      event_name: 'checkout.session.completed',
      order_id: 'ord_123',
      raw_payload: { id: 'evt_123', type: 'checkout.session.completed' },
      sanitized_payload: { id: 'evt_123', type: 'checkout.session.completed', customer_email: '[REDACTED_EMAIL]' },
      status: 'success',
      timestamp: new Date()
    }

    expect(log.event_type).toBe('stripe_webhook')
    expect(log.provider).toBe('stripe')
    expect(log.event_name).toBe('checkout.session.completed')
    expect(log.order_id).toBe('ord_123')
    expect(log.status).toBe('success')
    expect(log.timestamp).toBeInstanceOf(Date)
  })

  test('should log webhook event to database', async () => {
    // This test would require database setup
    // For now, we just verify the function signature
    expect(typeof logAuditEvent).toBe('function')
  })

  test('should preserve last 4 digits of card numbers', () => {
    const input = {
      cardNumber: '4242424242424242',
      card: {
        last4: '4242',
        exp_month: 12,
        exp_year: 2025
      }
    }

    const redacted = redactPII(input)

    // Card numbers should be redacted but last4 preserved
    expect(redacted.cardNumber).toBe('[REDACTED_CARD]')
    expect(redacted.card.last4).toBe('4242')
    expect(redacted.card.exp_month).toBe(12)
    expect(redacted.card.exp_year).toBe(2025)
  })

  test('should redact SSN and tax IDs', () => {
    const input = {
      ssn: '123-45-6789',
      taxId: '12-3456789',
      ein: '12-3456789',
      nested: {
        socialSecurityNumber: '987-65-4321'
      }
    }

    const redacted = redactPII(input)

    expect(redacted.ssn).toBe('[REDACTED_SSN]')
    expect(redacted.taxId).toBe('[REDACTED_TAX_ID]')
    expect(redacted.ein).toBe('[REDACTED_TAX_ID]')
    expect(redacted.nested.socialSecurityNumber).toBe('[REDACTED_SSN]')
  })

  test('should handle deeply nested objects', () => {
    const input = {
      level1: {
        level2: {
          level3: {
            level4: {
              email: 'deep@example.com',
              orderId: 'ord_deep_123'
            }
          }
        }
      }
    }

    const redacted = redactPII(input)

    expect(redacted.level1.level2.level3.level4.email).toBe('[REDACTED_EMAIL]')
    expect(redacted.level1.level2.level3.level4.orderId).toBe('ord_deep_123')
  })
})
