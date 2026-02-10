/**
 * E2E Tests for Provider Failover System
 * Feature: PB-034 - Provider Failover System
 *
 * Tests automatic failover when primary print provider is unavailable
 */

import { test, expect, describe } from '@playwright/test'
import {
  ProviderFailoverService,
  getFailoverService,
  resetFailoverService,
  type ProviderHealth,
  type FailoverConfig,
} from '@/lib/providers/failover'
import type {
  PrintProviderAdapter,
  PrintSpec,
  QuoteRequest,
  QuoteResult,
  CreateOrderRequest,
  OrderResult,
  OrderStatusUpdate,
  PrintProviderCapabilities,
} from '@/lib/print/orchestrator'

// ============================================================================
// MOCK ADAPTERS
// ============================================================================

class MockAdapter implements PrintProviderAdapter {
  constructor(
    public readonly providerId: string,
    public readonly providerName: string,
    private failureMode: 'none' | 'intermittent' | 'always' = 'none',
    private failureCount = 0
  ) {}

  setFailureMode(mode: 'none' | 'intermittent' | 'always'): void {
    this.failureMode = mode
    this.failureCount = 0
  }

  private shouldFail(): boolean {
    if (this.failureMode === 'always') return true
    if (this.failureMode === 'intermittent') {
      this.failureCount++
      return this.failureCount % 2 === 1
    }
    return false
  }

  async getCapabilities(): Promise<PrintProviderCapabilities> {
    if (this.shouldFail()) {
      throw new Error(`${this.providerName} is unavailable`)
    }

    return {
      productTypes: ['photo_book'],
      bindings: ['hardcover', 'softcover'],
      trimSizes: [{ width: 8, height: 8, unit: 'in', name: '8x8 Square' }],
      minPages: 20,
      maxPages: 200,
      paperTypes: ['standard'],
      colorSpaces: ['RGB'],
      shippingCountries: ['US'],
      features: {
        supportsTracking: true,
        supportsWebhooks: true,
        supportsCoverOnly: true,
        supportsCustomInterior: true,
        supportsBulkOrders: true,
      },
    }
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResult> {
    if (this.shouldFail()) {
      throw new Error(`${this.providerName} quote failed`)
    }

    return {
      providerId: this.providerId,
      providerName: this.providerName,
      unitCost: 10,
      totalCost: 10 * request.quantity,
      shippingCost: 5,
      currency: 'USD',
      estimatedProductionDays: 3,
      estimatedShippingDays: 5,
      estimatedTotalDays: 8,
      available: true,
    }
  }

  async createOrder(request: CreateOrderRequest): Promise<OrderResult> {
    if (this.shouldFail()) {
      throw new Error(`${this.providerName} order creation failed`)
    }

    return {
      success: true,
      providerOrderId: `${this.providerId}-${Date.now()}`,
      providerId: this.providerId,
      status: 'pending',
      unitCost: 10,
      totalCost: 10 * request.quantity,
      shippingCost: 5,
      currency: 'USD',
    }
  }

  async getOrderStatus(providerOrderId: string): Promise<OrderStatusUpdate> {
    if (this.shouldFail()) {
      throw new Error(`${this.providerName} status check failed`)
    }

    return {
      providerOrderId,
      status: 'in_production',
      updatedAt: new Date(),
    }
  }

  async cancelOrder(providerOrderId: string): Promise<{ success: boolean; message?: string }> {
    if (this.shouldFail()) {
      throw new Error(`${this.providerName} cancellation failed`)
    }

    return { success: true }
  }

  async validateSpec(spec: PrintSpec): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    if (this.shouldFail()) {
      throw new Error(`${this.providerName} validation failed`)
    }

    return { valid: true, errors: [], warnings: [] }
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('PB-034: Provider Failover System', () => {
  let service: ProviderFailoverService
  let primaryAdapter: MockAdapter
  let secondaryAdapter: MockAdapter
  let tertiaryAdapter: MockAdapter

  test.beforeEach(() => {
    resetFailoverService()
    service = getFailoverService({
      healthCheckEnabled: false, // Disable auto health checks in tests
      retryEnabled: true,
      retryAttempts: 2,
      retryBaseDelay: 100,
      retryMaxDelay: 1000,
      failoverEnabled: true,
      circuitBreakerThreshold: 3,
      circuitBreakerResetTimeout: 5000,
    })

    primaryAdapter = new MockAdapter('primary', 'Primary Provider')
    secondaryAdapter = new MockAdapter('secondary', 'Secondary Provider')
    tertiaryAdapter = new MockAdapter('tertiary', 'Tertiary Provider')

    service.registerProvider(primaryAdapter)
    service.registerProvider(secondaryAdapter)
    service.registerProvider(tertiaryAdapter)
  })

  test.afterEach(() => {
    service.shutdown()
    resetFailoverService()
  })

  describe('Provider Registration', () => {
    test('should register providers for monitoring', () => {
      const health = service.getAllProviderHealth()

      expect(health).toHaveLength(3)
      expect(health[0].providerId).toBe('primary')
      expect(health[0].healthy).toBe(true)
      expect(health[0].circuitOpen).toBe(false)
    })

    test('should initialize with zero failures', () => {
      const health = service.getProviderHealth('primary')

      expect(health).toBeDefined()
      expect(health!.failureCount).toBe(0)
      expect(health!.circuitOpen).toBe(false)
    })
  })

  describe('Provider Selection', () => {
    test('should select primary provider when all healthy', () => {
      const decision = service.selectProvider(['primary', 'secondary', 'tertiary'])

      expect(decision.useProvider).toBe('primary')
      expect(decision.reason).toContain('primary provider')
      expect(decision.fallbackChain).toEqual(['primary', 'secondary', 'tertiary'])
    })

    test('should skip unavailable providers', () => {
      const health = service.getProviderHealth('primary')!
      health.circuitOpen = true
      health.circuitOpenUntil = new Date(Date.now() + 10000)
      health.healthy = false

      const decision = service.selectProvider(['primary', 'secondary', 'tertiary'])

      expect(decision.useProvider).toBe('secondary')
      expect(decision.reason).toContain('fallback')
    })

    test('should fallback to primary if all unavailable', () => {
      const providers = ['primary', 'secondary', 'tertiary']
      for (const id of providers) {
        const health = service.getProviderHealth(id)!
        health.circuitOpen = true
        health.circuitOpenUntil = new Date(Date.now() + 10000)
        health.healthy = false
      }

      const decision = service.selectProvider(providers)

      expect(decision.useProvider).toBe('primary')
      expect(decision.reason).toContain('All providers unavailable')
    })
  })

  describe('Retry Logic', () => {
    test('should retry on failure', async () => {
      primaryAdapter.setFailureMode('intermittent')

      const quoteRequest: QuoteRequest = {
        spec: {
          productType: 'photo_book',
          trimSize: { width: 8, height: 8, unit: 'in' },
          pageCount: 50,
          binding: 'hardcover',
          paperType: 'premium',
          colorSpace: 'RGB',
          interiorPdfUrl: 'https://example.com/interior.pdf',
          coverPdfUrl: 'https://example.com/cover.pdf',
        },
        quantity: 1,
        destinationCountry: 'US',
      }

      const { result, decision } = await service.getQuoteWithFailover(
        [primaryAdapter],
        quoteRequest
      )

      expect(result.providerId).toBe('primary')
      expect(decision.retriesAttempted).toBeGreaterThan(0)
    })

    test('should use exponential backoff for retries', async () => {
      primaryAdapter.setFailureMode('intermittent')

      const startTime = Date.now()

      const quoteRequest: QuoteRequest = {
        spec: {
          productType: 'photo_book',
          trimSize: { width: 8, height: 8, unit: 'in' },
          pageCount: 50,
          binding: 'hardcover',
          paperType: 'premium',
          colorSpace: 'RGB',
          interiorPdfUrl: 'https://example.com/interior.pdf',
          coverPdfUrl: 'https://example.com/cover.pdf',
        },
        quantity: 1,
        destinationCountry: 'US',
      }

      await service.getQuoteWithFailover([primaryAdapter], quoteRequest)

      const duration = Date.now() - startTime

      // Should take at least base delay (100ms) for one retry
      expect(duration).toBeGreaterThan(100)
    })

    test('should fail after max retries', async () => {
      primaryAdapter.setFailureMode('always')

      const quoteRequest: QuoteRequest = {
        spec: {
          productType: 'photo_book',
          trimSize: { width: 8, height: 8, unit: 'in' },
          pageCount: 50,
          binding: 'hardcover',
          paperType: 'premium',
          colorSpace: 'RGB',
          interiorPdfUrl: 'https://example.com/interior.pdf',
          coverPdfUrl: 'https://example.com/cover.pdf',
        },
        quantity: 1,
        destinationCountry: 'US',
      }

      await expect(
        service.getQuoteWithFailover([primaryAdapter], quoteRequest)
      ).rejects.toThrow('failed for all providers')
    })
  })

  describe('Failover to Secondary Provider', () => {
    test('should failover to secondary on primary failure', async () => {
      primaryAdapter.setFailureMode('always')

      const quoteRequest: QuoteRequest = {
        spec: {
          productType: 'photo_book',
          trimSize: { width: 8, height: 8, unit: 'in' },
          pageCount: 50,
          binding: 'hardcover',
          paperType: 'premium',
          colorSpace: 'RGB',
          interiorPdfUrl: 'https://example.com/interior.pdf',
          coverPdfUrl: 'https://example.com/cover.pdf',
        },
        quantity: 1,
        destinationCountry: 'US',
      }

      const { result, decision } = await service.getQuoteWithFailover(
        [primaryAdapter, secondaryAdapter],
        quoteRequest
      )

      expect(result.providerId).toBe('secondary')
      expect(decision.reason).toContain('fallback')
    })

    test('should failover through multiple providers', async () => {
      primaryAdapter.setFailureMode('always')
      secondaryAdapter.setFailureMode('always')

      const quoteRequest: QuoteRequest = {
        spec: {
          productType: 'photo_book',
          trimSize: { width: 8, height: 8, unit: 'in' },
          pageCount: 50,
          binding: 'hardcover',
          paperType: 'premium',
          colorSpace: 'RGB',
          interiorPdfUrl: 'https://example.com/interior.pdf',
          coverPdfUrl: 'https://example.com/cover.pdf',
        },
        quantity: 1,
        destinationCountry: 'US',
      }

      const { result, decision } = await service.getQuoteWithFailover(
        [primaryAdapter, secondaryAdapter, tertiaryAdapter],
        quoteRequest
      )

      expect(result.providerId).toBe('tertiary')
      expect(decision.fallbackChain).toHaveLength(3)
    })
  })

  describe('Circuit Breaker', () => {
    test('should open circuit after threshold failures', async () => {
      primaryAdapter.setFailureMode('always')

      const quoteRequest: QuoteRequest = {
        spec: {
          productType: 'photo_book',
          trimSize: { width: 8, height: 8, unit: 'in' },
          pageCount: 50,
          binding: 'hardcover',
          paperType: 'premium',
          colorSpace: 'RGB',
          interiorPdfUrl: 'https://example.com/interior.pdf',
          coverPdfUrl: 'https://example.com/cover.pdf',
        },
        quantity: 1,
        destinationCountry: 'US',
      }

      // Try 3 times to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await service.getQuoteWithFailover([primaryAdapter, secondaryAdapter], quoteRequest)
        } catch (e) {
          // Ignore errors
        }
      }

      const health = service.getProviderHealth('primary')!

      expect(health.circuitOpen).toBe(true)
      expect(health.failureCount).toBeGreaterThanOrEqual(3)
    })

    test('should prevent requests when circuit open', () => {
      const health = service.getProviderHealth('primary')!
      health.circuitOpen = true
      health.circuitOpenUntil = new Date(Date.now() + 10000)
      health.healthy = false

      const available = service.isProviderAvailable('primary')

      expect(available).toBe(false)
    })

    test('should reset circuit after timeout', () => {
      const health = service.getProviderHealth('primary')!
      health.circuitOpen = true
      health.circuitOpenUntil = new Date(Date.now() - 1000) // Already expired
      health.failureCount = 5

      const available = service.isProviderAvailable('primary')

      expect(available).toBe(true)

      const updatedHealth = service.getProviderHealth('primary')!
      expect(updatedHealth.circuitOpen).toBe(false)
    })
  })

  describe('Quote Failover', () => {
    test('should get quote with primary provider', async () => {
      const quoteRequest: QuoteRequest = {
        spec: {
          productType: 'photo_book',
          trimSize: { width: 8, height: 8, unit: 'in' },
          pageCount: 50,
          binding: 'hardcover',
          paperType: 'premium',
          colorSpace: 'RGB',
          interiorPdfUrl: 'https://example.com/interior.pdf',
          coverPdfUrl: 'https://example.com/cover.pdf',
        },
        quantity: 1,
        destinationCountry: 'US',
      }

      const { result, decision } = await service.getQuoteWithFailover(
        [primaryAdapter, secondaryAdapter],
        quoteRequest
      )

      expect(result.providerId).toBe('primary')
      expect(result.totalCost).toBe(10)
      expect(result.shippingCost).toBe(5)
      expect(decision.useProvider).toBe('primary')
    })
  })

  describe('Order Creation Failover', () => {
    test('should create order with failover', async () => {
      primaryAdapter.setFailureMode('always')

      const orderRequest: CreateOrderRequest = {
        spec: {
          productType: 'photo_book',
          trimSize: { width: 8, height: 8, unit: 'in' },
          pageCount: 50,
          binding: 'hardcover',
          paperType: 'premium',
          colorSpace: 'RGB',
          interiorPdfUrl: 'https://example.com/interior.pdf',
          coverPdfUrl: 'https://example.com/cover.pdf',
        },
        quantity: 1,
        shippingAddress: {
          name: 'Test User',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
        bookId: 'book123',
        workspaceId: 'workspace123',
        userId: 'user123',
        renditionId: 'rendition123',
      }

      const { result, decision } = await service.createOrderWithFailover(
        [primaryAdapter, secondaryAdapter],
        orderRequest
      )

      expect(result.success).toBe(true)
      expect(result.providerId).toBe('secondary')
      expect(decision.reason).toContain('fallback')
    })
  })

  describe('Order Status Failover', () => {
    test('should get order status with failover', async () => {
      primaryAdapter.setFailureMode('always')

      const { result, decision } = await service.getOrderStatusWithFailover(
        [primaryAdapter, secondaryAdapter],
        'order123'
      )

      expect(result.status).toBe('in_production')
      expect(decision.useProvider).toBe('secondary')
    })
  })

  describe('Health Recovery', () => {
    test('should mark provider healthy after successful operation', async () => {
      const health = service.getProviderHealth('primary')!
      health.failureCount = 2
      health.healthy = false

      const quoteRequest: QuoteRequest = {
        spec: {
          productType: 'photo_book',
          trimSize: { width: 8, height: 8, unit: 'in' },
          pageCount: 50,
          binding: 'hardcover',
          paperType: 'premium',
          colorSpace: 'RGB',
          interiorPdfUrl: 'https://example.com/interior.pdf',
          coverPdfUrl: 'https://example.com/cover.pdf',
        },
        quantity: 1,
        destinationCountry: 'US',
      }

      await service.getQuoteWithFailover([primaryAdapter], quoteRequest)

      const updatedHealth = service.getProviderHealth('primary')!
      expect(updatedHealth.healthy).toBe(true)
      expect(updatedHealth.failureCount).toBe(0)
      expect(updatedHealth.circuitOpen).toBe(false)
    })
  })
})
