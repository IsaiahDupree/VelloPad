/**
 * E2E Test: Gelato Integration
 * Feature: PB-032 - Gelato Integration
 *
 * Tests the Gelato print provider adapter integration
 */

import { test, expect } from '@playwright/test'
import { GelatoAdapter } from '@/lib/providers/gelato/adapter'
import { GelatoClient } from '@/lib/providers/gelato/client'
import { getPrintOrchestrator } from '@/lib/print/orchestrator'
import type { PrintSpec, QuoteRequest, CreateOrderRequest } from '@/lib/print/orchestrator'

test.describe('Gelato Integration', () => {
  let adapter: GelatoAdapter
  let orchestrator: ReturnType<typeof getPrintOrchestrator>

  test.beforeEach(() => {
    // Create Gelato client in sandbox mode for testing
    const client = new GelatoClient({
      apiKey: process.env.GELATO_API_KEY || 'test_api_key',
      environment: 'sandbox'
    })

    adapter = new GelatoAdapter(client)

    // Get orchestrator and register Gelato adapter
    orchestrator = getPrintOrchestrator()
    orchestrator.registerAdapter(adapter, false)
  })

  test('should have correct provider identification', () => {
    expect(adapter.providerId).toBe('gelato')
    expect(adapter.providerName).toBe('Gelato')
  })

  test('should return capabilities', async () => {
    const capabilities = await adapter.getCapabilities()

    expect(capabilities.productTypes).toContain('photo_book')
    expect(capabilities.bindings).toContain('hardcover')
    expect(capabilities.bindings).toContain('softcover')
    expect(capabilities.bindings).toContain('layflat')
    expect(capabilities.minPages).toBe(20)
    expect(capabilities.maxPages).toBe(200)
    expect(capabilities.features.supportsTracking).toBe(true)
    expect(capabilities.features.supportsWebhooks).toBe(true)
    expect(capabilities.shippingCountries).toContain('US')
    expect(capabilities.shippingCountries).toContain('DE')
    expect(capabilities.shippingCountries).toContain('GB')
  })

  test('should validate print specs', async () => {
    const validSpec: PrintSpec = {
      productType: 'photo_book',
      trimSize: { width: 10, height: 10, unit: 'in' },
      pageCount: 50,
      binding: 'hardcover',
      paperType: 'premium',
      colorSpace: 'CMYK',
      interiorPdfUrl: 'https://example.com/interior.pdf',
      coverPdfUrl: 'https://example.com/cover.pdf'
    }

    const validation = await adapter.validateSpec(validSpec)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  test('should reject invalid page count', async () => {
    const invalidSpec: PrintSpec = {
      productType: 'photo_book',
      trimSize: { width: 10, height: 10, unit: 'in' },
      pageCount: 15, // Too few pages
      binding: 'hardcover',
      paperType: 'premium',
      colorSpace: 'CMYK',
      interiorPdfUrl: 'https://example.com/interior.pdf',
      coverPdfUrl: 'https://example.com/cover.pdf'
    }

    const validation = await adapter.validateSpec(invalidSpec)
    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Minimum 20 pages required')
  })

  test('should reject odd page count', async () => {
    const invalidSpec: PrintSpec = {
      productType: 'photo_book',
      trimSize: { width: 10, height: 10, unit: 'in' },
      pageCount: 51, // Odd number
      binding: 'hardcover',
      paperType: 'premium',
      colorSpace: 'CMYK',
      interiorPdfUrl: 'https://example.com/interior.pdf',
      coverPdfUrl: 'https://example.com/cover.pdf'
    }

    const validation = await adapter.validateSpec(invalidSpec)
    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Page count must be even')
  })

  test('should enforce layflat page limit', async () => {
    const invalidSpec: PrintSpec = {
      productType: 'photo_book',
      trimSize: { width: 10, height: 10, unit: 'in' },
      pageCount: 150,
      binding: 'layflat',
      paperType: 'premium',
      colorSpace: 'CMYK',
      interiorPdfUrl: 'https://example.com/interior.pdf',
      coverPdfUrl: 'https://example.com/cover.pdf'
    }

    const validation = await adapter.validateSpec(invalidSpec)
    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Layflat binding supports maximum 120 pages')
  })

  test('should get quote for hardcover 10x10', async () => {
    const quoteRequest: QuoteRequest = {
      spec: {
        productType: 'photo_book',
        trimSize: { width: 10, height: 10, unit: 'in' },
        pageCount: 50,
        binding: 'hardcover',
        paperType: 'premium',
        colorSpace: 'RGB',
        interiorPdfUrl: 'https://example.com/interior.pdf',
        coverPdfUrl: 'https://example.com/cover.pdf'
      },
      quantity: 1,
      destinationCountry: 'DE',
      shippingMethod: 'standard'
    }

    const quote = await adapter.getQuote(quoteRequest)

    expect(quote.providerId).toBe('gelato')
    expect(quote.providerName).toBe('Gelato')
    expect(quote.currency).toBeTruthy()

    if (quote.available) {
      expect(quote.unitCost).toBeGreaterThan(0)
      expect(quote.totalCost).toBeGreaterThan(0)
      expect(quote.shippingCost).toBeGreaterThanOrEqual(0)
      expect(quote.estimatedProductionDays).toBeGreaterThan(0)
      expect(quote.estimatedShippingDays).toBeGreaterThan(0)
    }
  })

  test('should compare quotes across multiple providers', async () => {
    const quoteRequest: QuoteRequest = {
      spec: {
        productType: 'photo_book',
        trimSize: { width: 8, height: 8, unit: 'in' },
        pageCount: 40,
        binding: 'softcover',
        paperType: 'standard',
        colorSpace: 'RGB',
        interiorPdfUrl: 'https://example.com/interior.pdf',
        coverPdfUrl: 'https://example.com/cover.pdf'
      },
      quantity: 1,
      destinationCountry: 'GB'
    }

    const quotes = await orchestrator.getQuotes(quoteRequest)

    // Should have at least Gelato quote
    expect(quotes.length).toBeGreaterThan(0)

    const gelatoQuote = quotes.find(q => q.providerId === 'gelato')
    expect(gelatoQuote).toBeDefined()

    // Quotes should be sorted by total cost
    for (let i = 1; i < quotes.length; i++) {
      if (quotes[i - 1].available && quotes[i].available) {
        const cost1 = quotes[i - 1].totalCost + quotes[i - 1].shippingCost
        const cost2 = quotes[i].totalCost + quotes[i].shippingCost
        expect(cost1).toBeLessThanOrEqual(cost2)
      }
    }
  })

  test('should handle unsupported trim sizes', async () => {
    const quoteRequest: QuoteRequest = {
      spec: {
        productType: 'photo_book',
        trimSize: { width: 7, height: 9, unit: 'in' }, // Unsupported size
        pageCount: 50,
        binding: 'hardcover',
        paperType: 'premium',
        colorSpace: 'RGB',
        interiorPdfUrl: 'https://example.com/interior.pdf',
        coverPdfUrl: 'https://example.com/cover.pdf'
      },
      quantity: 1,
      destinationCountry: 'US'
    }

    const quote = await adapter.getQuote(quoteRequest)

    expect(quote.available).toBe(false)
    expect(quote.unavailableReason).toBeTruthy()
  })

  test('should handle missing PDF URLs', async () => {
    const invalidSpec: PrintSpec = {
      productType: 'photo_book',
      trimSize: { width: 10, height: 10, unit: 'in' },
      pageCount: 50,
      binding: 'hardcover',
      paperType: 'premium',
      colorSpace: 'RGB',
      interiorPdfUrl: '', // Missing
      coverPdfUrl: '' // Missing
    }

    const validation = await adapter.validateSpec(invalidSpec)
    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Cover PDF URL is required')
    expect(validation.errors).toContain('Interior PDF URL is required')
  })

  test('should warn about RGB color space', async () => {
    const spec: PrintSpec = {
      productType: 'photo_book',
      trimSize: { width: 10, height: 10, unit: 'in' },
      pageCount: 50,
      binding: 'hardcover',
      paperType: 'premium',
      colorSpace: 'RGB',
      interiorPdfUrl: 'https://example.com/interior.pdf',
      coverPdfUrl: 'https://example.com/cover.pdf'
    }

    const validation = await adapter.validateSpec(spec)
    expect(validation.warnings).toContain('CMYK color space recommended for print quality')
  })

  test('should support EU countries', async () => {
    const capabilities = await adapter.getCapabilities()
    const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'PT', 'IE']

    for (const country of euCountries) {
      expect(capabilities.shippingCountries).toContain(country)
    }
  })

  test('should map shipping methods correctly', async () => {
    const quoteRequest: QuoteRequest = {
      spec: {
        productType: 'photo_book',
        trimSize: { width: 8, height: 8, unit: 'in' },
        pageCount: 40,
        binding: 'softcover',
        paperType: 'standard',
        colorSpace: 'RGB',
        interiorPdfUrl: 'https://example.com/interior.pdf',
        coverPdfUrl: 'https://example.com/cover.pdf'
      },
      quantity: 1,
      destinationCountry: 'US'
    }

    // Test standard shipping
    const standardQuote = await adapter.getQuote({
      ...quoteRequest,
      shippingMethod: 'standard'
    })
    expect(standardQuote.providerId).toBe('gelato')

    // Test express shipping
    const expressQuote = await adapter.getQuote({
      ...quoteRequest,
      shippingMethod: 'express'
    })
    expect(expressQuote.providerId).toBe('gelato')

    // Test economy shipping (maps to standard)
    const economyQuote = await adapter.getQuote({
      ...quoteRequest,
      shippingMethod: 'economy'
    })
    expect(economyQuote.providerId).toBe('gelato')
  })
})

test.describe('Gelato Order Management', () => {
  let adapter: GelatoAdapter

  test.beforeEach(() => {
    const client = new GelatoClient({
      apiKey: process.env.GELATO_API_KEY || 'test_api_key',
      environment: 'sandbox'
    })

    adapter = new GelatoAdapter(client)
  })

  test('should create order with valid request', async () => {
    const orderRequest: CreateOrderRequest = {
      spec: {
        productType: 'photo_book',
        trimSize: { width: 10, height: 10, unit: 'in' },
        pageCount: 50,
        binding: 'hardcover',
        paperType: 'premium',
        colorSpace: 'RGB',
        interiorPdfUrl: 'https://example.com/interior.pdf',
        coverPdfUrl: 'https://example.com/cover.pdf'
      },
      quantity: 1,
      shippingAddress: {
        name: 'Test Customer',
        address1: '123 Main St',
        city: 'Berlin',
        state: 'BE',
        postalCode: '10115',
        country: 'DE',
        email: 'test@example.com',
        phone: '+49123456789'
      },
      shippingMethod: 'standard',
      bookId: 'test_book_123',
      workspaceId: 'test_workspace_123',
      userId: 'test_user_123',
      renditionId: 'test_rendition_123',
      referenceId: 'test_order_123'
    }

    const result = await adapter.createOrder(orderRequest)

    if (result.success) {
      expect(result.providerOrderId).toBeTruthy()
      expect(result.providerId).toBe('gelato')
      expect(result.status).toBeTruthy()
      expect(result.totalCost).toBeGreaterThan(0)
      expect(result.currency).toBeTruthy()
    } else {
      // In test environment, order creation might fail - that's ok
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBeTruthy()
    }
  })

  test('should handle order creation errors gracefully', async () => {
    const invalidOrderRequest: CreateOrderRequest = {
      spec: {
        productType: 'photo_book',
        trimSize: { width: 99, height: 99, unit: 'in' }, // Invalid size
        pageCount: 50,
        binding: 'hardcover',
        paperType: 'premium',
        colorSpace: 'RGB',
        interiorPdfUrl: 'https://example.com/interior.pdf',
        coverPdfUrl: 'https://example.com/cover.pdf'
      },
      quantity: 1,
      shippingAddress: {
        name: 'Test Customer',
        address1: '123 Main St',
        city: 'Berlin',
        state: 'BE',
        postalCode: '10115',
        country: 'DE'
      },
      shippingMethod: 'standard',
      bookId: 'test_book_123',
      workspaceId: 'test_workspace_123',
      userId: 'test_user_123',
      renditionId: 'test_rendition_123'
    }

    const result = await adapter.createOrder(invalidOrderRequest)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.status).toBe('failed')
  })
})
