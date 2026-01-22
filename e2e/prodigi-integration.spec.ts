/**
 * E2E Tests for Prodigi API Integration
 * @see PB-013: Prodigi API Integration
 */

import { test, expect } from '@playwright/test'
import {
  ProdigiClient,
  getProdigiSKU,
  validateProdigiOrder,
  PRODIGI_PHOTO_BOOK_SKUS
} from '../src/lib/providers/prodigi'

test.describe('PB-013: Prodigi API Integration', () => {
  test('should export ProdigiClient class', () => {
    expect(ProdigiClient).toBeDefined()
    expect(typeof ProdigiClient).toBe('function')
  })

  test('should create ProdigiClient with config', () => {
    const client = new ProdigiClient({
      apiKey: 'test-api-key',
      environment: 'sandbox'
    })

    expect(client).toBeDefined()
    expect(client).toBeInstanceOf(ProdigiClient)
  })

  test('should throw error without API key', () => {
    expect(() => {
      new ProdigiClient({
        apiKey: '',
        environment: 'sandbox'
      })
    }).toThrow('Prodigi API key is required')
  })

  test('should have all photo book SKUs defined', () => {
    expect(PRODIGI_PHOTO_BOOK_SKUS).toBeDefined()

    // Check hardcover options
    expect(PRODIGI_PHOTO_BOOK_SKUS['hardcover-8x8']).toBeDefined()
    expect(PRODIGI_PHOTO_BOOK_SKUS['hardcover-10x10']).toBeDefined()
    expect(PRODIGI_PHOTO_BOOK_SKUS['hardcover-12x12']).toBeDefined()
    expect(PRODIGI_PHOTO_BOOK_SKUS['hardcover-8x11']).toBeDefined()

    // Check softcover options
    expect(PRODIGI_PHOTO_BOOK_SKUS['softcover-8x8']).toBeDefined()
    expect(PRODIGI_PHOTO_BOOK_SKUS['softcover-10x10']).toBeDefined()
    expect(PRODIGI_PHOTO_BOOK_SKUS['softcover-12x12']).toBeDefined()
    expect(PRODIGI_PHOTO_BOOK_SKUS['softcover-8x11']).toBeDefined()

    // Check layflat options
    expect(PRODIGI_PHOTO_BOOK_SKUS['layflat-8x8']).toBeDefined()
    expect(PRODIGI_PHOTO_BOOK_SKUS['layflat-10x10']).toBeDefined()
    expect(PRODIGI_PHOTO_BOOK_SKUS['layflat-12x12']).toBeDefined()
  })

  test('should get correct SKU for configuration', () => {
    const sku8x8Soft = getProdigiSKU('8x8', 'softcover')
    expect(sku8x8Soft).toBe(PRODIGI_PHOTO_BOOK_SKUS['softcover-8x8'])

    const sku10x10Hard = getProdigiSKU('10x10', 'hardcover')
    expect(sku10x10Hard).toBe(PRODIGI_PHOTO_BOOK_SKUS['hardcover-10x10'])

    const sku12x12Layflat = getProdigiSKU('12x12', 'layflat')
    expect(sku12x12Layflat).toBe(PRODIGI_PHOTO_BOOK_SKUS['layflat-12x12'])

    const sku8x11Hard = getProdigiSKU('8x11', 'hardcover')
    expect(sku8x11Hard).toBe(PRODIGI_PHOTO_BOOK_SKUS['hardcover-8x11'])
  })

  test('should validate valid order configuration', () => {
    const result = validateProdigiOrder('8x8', 'softcover', 50)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('should reject invalid size', () => {
    const result = validateProdigiOrder('5x5', 'softcover', 50)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some(e => e.includes('size'))).toBe(true)
  })

  test('should reject invalid binding', () => {
    const result = validateProdigiOrder('8x8', 'invalid', 50)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some(e => e.includes('binding'))).toBe(true)
  })

  test('should reject too few pages', () => {
    const result = validateProdigiOrder('8x8', 'softcover', 10)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Minimum 20 pages'))).toBe(true)
  })

  test('should reject too many pages', () => {
    const result = validateProdigiOrder('8x8', 'softcover', 250)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Maximum 200 pages'))).toBe(true)
  })

  test('should reject layflat with too many pages', () => {
    const result = validateProdigiOrder('8x8', 'layflat', 150)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Layflat'))).toBe(true)
    expect(result.errors.some(e => e.includes('120 pages'))).toBe(true)
  })

  test('should accept layflat with valid page count', () => {
    const result = validateProdigiOrder('8x8', 'layflat', 100)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('ProdigiClient should have required methods', () => {
    const client = new ProdigiClient({
      apiKey: 'test-key',
      environment: 'sandbox'
    })

    expect(typeof client.createOrder).toBe('function')
    expect(typeof client.getOrder).toBe('function')
    expect(typeof client.getOrderByReference).toBe('function')
    expect(typeof client.updateOrder).toBe('function')
    expect(typeof client.cancelOrder).toBe('function')
    expect(typeof client.getQuote).toBe('function')
    expect(typeof client.listProducts).toBe('function')
    expect(typeof client.getProduct).toBe('function')
    expect(typeof client.submitOrder).toBe('function')
  })

  test('should support both sandbox and production environments', () => {
    const sandboxClient = new ProdigiClient({
      apiKey: 'test-key',
      environment: 'sandbox'
    })

    const prodClient = new ProdigiClient({
      apiKey: 'test-key',
      environment: 'production'
    })

    expect(sandboxClient).toBeDefined()
    expect(prodClient).toBeDefined()
  })
})
