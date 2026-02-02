/**
 * E2E Test: PM-009 - Print Provider Adapter Composition
 *
 * Tests the composition of product mode adapters (cover-only, custom interior)
 * with print provider adapters (Prodigi, Gelato, etc.)
 */

import { test, expect } from '@playwright/test';
import { CoverOnlyAdapter } from '../lib/adapters/cover-only-adapter';
import { ComposedAdapter, composeAdapters, composeWithMultipleProviders, selectBestAdapter } from '../lib/adapters/composer';
import type { PrintProviderAdapter, PrintSpec, QuoteRequest as PrintQuoteRequest, QuoteResult, CreateOrderRequest as PrintOrderRequest, OrderResult, OrderStatusUpdate } from '@/lib/print/orchestrator';
import type { NotebookAdapter, ProductSpec, QuoteRequest as NotebookQuoteRequest } from '../lib/adapters/notebook-adapter';

// =============================================================================
// MOCK PRINT PROVIDER ADAPTERS
// =============================================================================

class MockProdigiAdapter implements PrintProviderAdapter {
  providerId = 'prodigi';
  providerName = 'Prodigi';
  version = '1.0.0';

  async validateSpec(spec: PrintSpec): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    return { valid: true, errors: [], warnings: [] };
  }

  async getQuote(request: PrintQuoteRequest): Promise<QuoteResult> {
    return {
      available: true,
      quoteId: 'prodigi-quote-123',
      totalCost: 10.00,
      shippingCost: 5.99,
      currency: 'USD',
      estimatedProductionDays: 3,
      estimatedShippingDays: 5
    };
  }

  async createOrder(request: PrintOrderRequest): Promise<OrderResult> {
    return {
      success: true,
      providerOrderId: 'prodigi-order-123',
      status: 'submitted',
      estimatedDeliveryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)
    };
  }

  async getOrderStatus(providerOrderId: string): Promise<OrderStatusUpdate> {
    return {
      providerOrderId,
      status: 'in_production',
      trackingNumber: 'TRACK123'
    };
  }
}

class MockGelatoAdapter implements PrintProviderAdapter {
  providerId = 'gelato';
  providerName = 'Gelato';
  version = '1.0.0';

  async validateSpec(spec: PrintSpec): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    return { valid: true, errors: [], warnings: [] };
  }

  async getQuote(request: PrintQuoteRequest): Promise<QuoteResult> {
    return {
      available: true,
      quoteId: 'gelato-quote-456',
      totalCost: 9.50,
      shippingCost: 4.99,
      currency: 'USD',
      estimatedProductionDays: 2,
      estimatedShippingDays: 4
    };
  }

  async createOrder(request: PrintOrderRequest): Promise<OrderResult> {
    return {
      success: true,
      providerOrderId: 'gelato-order-456',
      status: 'submitted',
      estimatedDeliveryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
    };
  }

  async getOrderStatus(providerOrderId: string): Promise<OrderStatusUpdate> {
    return {
      providerOrderId,
      status: 'in_production',
      trackingNumber: 'GELATO123'
    };
  }
}

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestProductSpec(): ProductSpec {
  return {
    productMode: 'cover-only',
    pageSize: '6x9',
    bindingType: 'perfect_bound',
    pageCount: 100,
    paperType: 'standard-white',
    coverDesign: {
      frontImage: 'https://example.com/cover-front.pdf',
      title: 'Test Notebook',
      author: 'Test Author'
    },
    interior: {
      type: 'stock',
      stockInteriorId: 'lined-100-6x9'
    },
    printSpec: {
      colorMode: 'bw',
      finish: 'matte'
    }
  };
}

function createTestQuoteRequest(): NotebookQuoteRequest {
  return {
    productSpec: createTestProductSpec(),
    quantity: 100,
    shippingAddress: {
      name: 'Test Customer',
      line1: '123 Test St',
      city: 'Test City',
      state: 'CA',
      postalCode: '90001',
      country: 'US'
    },
    shippingMethod: 'standard'
  };
}

// =============================================================================
// TESTS
// =============================================================================

test.describe('Adapter Composition', () => {
  let coverOnlyAdapter: CoverOnlyAdapter;
  let prodigiAdapter: MockProdigiAdapter;
  let gelatoAdapter: MockGelatoAdapter;

  test.beforeEach(() => {
    coverOnlyAdapter = new CoverOnlyAdapter();
    prodigiAdapter = new MockProdigiAdapter();
    gelatoAdapter = new MockGelatoAdapter();
  });

  test('should compose cover-only adapter with Prodigi provider', () => {
    const composed = composeAdapters(coverOnlyAdapter, prodigiAdapter);

    expect(composed).toBeInstanceOf(ComposedAdapter);
    expect(composed.name).toBe('cover-only+prodigi');
    expect(composed.productMode).toBe('cover-only');
  });

  test('should inherit capabilities from product adapter', () => {
    const composed = composeAdapters(coverOnlyAdapter, prodigiAdapter);
    const capabilities = composed.getCapabilities();

    expect(capabilities.supportsCoverOnly).toBe(true);
    expect(capabilities.supportsCoverDesign).toBe(true);
    expect(capabilities.supportsCustomInterior).toBe(false);
  });

  test('should inherit asset requirements from product adapter', () => {
    const composed = composeAdapters(coverOnlyAdapter, prodigiAdapter);
    const requirements = composed.getAssetRequirements();

    expect(requirements.coverImage?.required).toBe(true);
    expect(requirements.stockInterior?.required).toBe(true);
    expect(requirements.interiorImages?.required).toBe(false);
  });

  test('should validate product spec', () => {
    const composed = composeAdapters(coverOnlyAdapter, prodigiAdapter);
    const spec = createTestProductSpec();

    const validation = composed.validateSpec(spec);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should reject invalid product spec', () => {
    const composed = composeAdapters(coverOnlyAdapter, prodigiAdapter);
    const spec = createTestProductSpec();

    // Make spec invalid by removing stock interior ID
    spec.interior.stockInteriorId = undefined;

    const validation = composed.validateSpec(spec);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors[0]).toContain('Stock interior ID is required');
  });
});

test.describe('Quote Flow', () => {
  let composed: ComposedAdapter;

  test.beforeEach(() => {
    const coverOnlyAdapter = new CoverOnlyAdapter();
    const prodigiAdapter = new MockProdigiAdapter();
    composed = composeAdapters(coverOnlyAdapter, prodigiAdapter);
  });

  test('should get quote from composed adapter', async () => {
    const request = createTestQuoteRequest();

    const quote = await composed.getQuote(request);

    expect(quote).toBeDefined();
    expect(quote.provider).toBe('prodigi');
    expect(quote.quoteId).toBeDefined();
    expect(quote.totalCost).toBeGreaterThan(0);
    expect(quote.productionCost).toBeGreaterThan(0);
    expect(quote.shippingCost).toBeGreaterThan(0);
    expect(quote.currency).toBe('USD');
    expect(quote.estimatedProductionDays).toBeGreaterThan(0);
    expect(quote.estimatedShippingDays).toBeGreaterThan(0);
  });

  test('should include metadata in quote response', async () => {
    const request = createTestQuoteRequest();

    const quote = await composed.getQuote(request);

    expect(quote.metadata).toBeDefined();
    expect(quote.metadata.productAdapter).toBe('cover-only');
    expect(quote.metadata.printProvider).toBe('Prodigi');
    expect(quote.metadata.productMode).toBe('cover-only');
  });

  test('should reject quote for invalid spec', async () => {
    const request = createTestQuoteRequest();
    request.productSpec.interior.stockInteriorId = undefined;

    await expect(composed.getQuote(request)).rejects.toThrow(/Invalid product spec/);
  });
});

test.describe('Order Flow', () => {
  let composed: ComposedAdapter;

  test.beforeEach(() => {
    const coverOnlyAdapter = new CoverOnlyAdapter();
    const prodigiAdapter = new MockProdigiAdapter();
    composed = composeAdapters(coverOnlyAdapter, prodigiAdapter);
  });

  test('should create order from composed adapter', async () => {
    const request = {
      ...createTestQuoteRequest(),
      assets: {
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: 'https://example.com/interior.pdf'
      }
    };

    const order = await composed.createOrder(request);

    expect(order).toBeDefined();
    expect(order.provider).toBe('prodigi');
    expect(order.providerOrderId).toBeDefined();
    expect(order.orderId).toBeDefined();
    expect(order.status).toBeDefined();
  });

  test('should include metadata in order response', async () => {
    const request = {
      ...createTestQuoteRequest(),
      assets: {
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: 'https://example.com/interior.pdf'
      }
    };

    const order = await composed.createOrder(request);

    expect(order.metadata).toBeDefined();
    expect(order.metadata.productAdapter).toBe('cover-only');
    expect(order.metadata.printProvider).toBe('Prodigi');
    expect(order.metadata.productMode).toBe('cover-only');
  });

  test('should get order status', async () => {
    const status = await composed.getOrderStatus('prodigi-order-123');

    expect(status).toBeDefined();
    expect(status.orderId).toBe('prodigi-order-123');
    expect(status.status).toBeDefined();
  });
});

test.describe('Multi-Provider Composition', () => {
  let coverOnlyAdapter: CoverOnlyAdapter;
  let prodigiAdapter: MockProdigiAdapter;
  let gelatoAdapter: MockGelatoAdapter;

  test.beforeEach(() => {
    coverOnlyAdapter = new CoverOnlyAdapter();
    prodigiAdapter = new MockProdigiAdapter();
    gelatoAdapter = new MockGelatoAdapter();
  });

  test('should compose with multiple providers', () => {
    const composers = composeWithMultipleProviders(
      coverOnlyAdapter,
      [prodigiAdapter, gelatoAdapter]
    );

    expect(composers).toHaveLength(2);
    expect(composers[0].name).toBe('cover-only+prodigi');
    expect(composers[1].name).toBe('cover-only+gelato');
  });

  test('should select cheapest provider', async () => {
    const composers = composeWithMultipleProviders(
      coverOnlyAdapter,
      [prodigiAdapter, gelatoAdapter]
    );

    const request = createTestQuoteRequest();

    const { adapter, quote } = await selectBestAdapter(composers, request, 'price');

    expect(adapter.name).toBe('cover-only+gelato'); // Gelato is cheaper
    expect(quote.totalCost).toBe(9.50 + 4.99);
  });

  test('should select fastest provider', async () => {
    const composers = composeWithMultipleProviders(
      coverOnlyAdapter,
      [prodigiAdapter, gelatoAdapter]
    );

    const request = createTestQuoteRequest();

    const { adapter, quote } = await selectBestAdapter(composers, request, 'speed');

    expect(adapter.name).toBe('cover-only+gelato'); // Gelato is faster (2+4=6 days vs 3+5=8 days)
    expect(quote.estimatedProductionDays + quote.estimatedShippingDays).toBe(6);
  });

  test('should handle provider failures gracefully', async () => {
    // Create a failing adapter
    class FailingAdapter implements PrintProviderAdapter {
      providerId = 'failing';
      providerName = 'Failing Provider';
      version = '1.0.0';

      async validateSpec() {
        return { valid: true, errors: [], warnings: [] };
      }

      async getQuote(): Promise<QuoteResult> {
        throw new Error('Provider unavailable');
      }

      async createOrder(): Promise<OrderResult> {
        throw new Error('Provider unavailable');
      }

      async getOrderStatus(): Promise<OrderStatusUpdate> {
        throw new Error('Provider unavailable');
      }
    }

    const composers = composeWithMultipleProviders(
      coverOnlyAdapter,
      [new FailingAdapter(), prodigiAdapter]
    );

    const request = createTestQuoteRequest();

    // Should successfully use Prodigi even though first provider failed
    const { adapter, quote } = await selectBestAdapter(composers, request, 'price');

    expect(adapter.name).toBe('cover-only+prodigi');
    expect(quote.provider).toBe('prodigi');
  });

  test('should throw error when all providers fail', async () => {
    class FailingAdapter implements PrintProviderAdapter {
      providerId = 'failing';
      providerName = 'Failing Provider';
      version = '1.0.0';

      async validateSpec() {
        return { valid: true, errors: [], warnings: [] };
      }

      async getQuote(): Promise<QuoteResult> {
        throw new Error('Provider unavailable');
      }

      async createOrder(): Promise<OrderResult> {
        throw new Error('Provider unavailable');
      }

      async getOrderStatus(): Promise<OrderStatusUpdate> {
        throw new Error('Provider unavailable');
      }
    }

    const composers = composeWithMultipleProviders(
      coverOnlyAdapter,
      [new FailingAdapter(), new FailingAdapter()]
    );

    const request = createTestQuoteRequest();

    await expect(selectBestAdapter(composers, request, 'price')).rejects.toThrow(/No print providers available/);
  });
});

test.describe('Transformation', () => {
  let composed: ComposedAdapter;

  test.beforeEach(() => {
    const coverOnlyAdapter = new CoverOnlyAdapter();
    const prodigiAdapter = new MockProdigiAdapter();
    composed = composeAdapters(coverOnlyAdapter, prodigiAdapter);
  });

  test('should transform product spec to print spec', async () => {
    const request = {
      ...createTestQuoteRequest(),
      assets: {
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: 'https://example.com/interior.pdf'
      }
    };

    // The transformation happens internally, but we can verify it worked
    // by checking that the order was created successfully
    const order = await composed.createOrder(request);

    expect(order).toBeDefined();
    expect(order.providerOrderId).toBeDefined();
  });

  test('should handle different binding types', async () => {
    const request = {
      ...createTestQuoteRequest(),
      assets: {
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: 'https://example.com/interior.pdf'
      }
    };

    // Test different binding types
    const bindingTypes: Array<ProductSpec['bindingType']> = ['perfect_bound', 'spiral', 'saddle_stitch'];

    for (const bindingType of bindingTypes) {
      request.productSpec.bindingType = bindingType;

      const order = await composed.createOrder(request);
      expect(order).toBeDefined();
    }
  });

  test('should handle different page sizes', async () => {
    const request = {
      ...createTestQuoteRequest(),
      assets: {
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: 'https://example.com/interior.pdf'
      }
    };

    // Test different page sizes
    const pageSizes: Array<ProductSpec['pageSize']> = ['5x8', '6x9', '8.5x11'];

    for (const pageSize of pageSizes) {
      request.productSpec.pageSize = pageSize;
      request.productSpec.interior.stockInteriorId = `lined-100-${pageSize}`;

      const order = await composed.createOrder(request);
      expect(order).toBeDefined();
    }
  });
});
