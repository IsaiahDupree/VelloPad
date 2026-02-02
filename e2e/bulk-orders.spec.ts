/**
 * E2E Test: PB-040 - Bulk Ordering
 *
 * Tests the bulk ordering system with volume discounts.
 * Validates tiered pricing, multi-shipment support, and order management.
 */

import { test, expect } from '@playwright/test';
import {
  VolumeDiscountCalculator,
  BulkOrderService,
  DEFAULT_VOLUME_TIERS,
  generateVolumePricingChart,
  calculateBulkSavings
} from '../lib/bulk-orders';
import type { PrintSpec } from '@/lib/print/orchestrator';

// =============================================================================
// TEST DATA
// =============================================================================

function createTestPrintSpec(): PrintSpec {
  return {
    productType: 'book',
    trimSize: {
      width: 6,
      height: 9,
      unit: 'in'
    },
    pageCount: 200,
    binding: 'perfect_bound',
    paperType: 'standard',
    colorSpace: 'CMYK',
    coverFinish: 'glossy',
    interiorPdfUrl: 'https://example.com/interior.pdf',
    coverPdfUrl: 'https://example.com/cover.pdf'
  };
}

// =============================================================================
// VOLUME DISCOUNT TESTS
// =============================================================================

test.describe('Volume Discount Calculator', () => {
  let calculator: VolumeDiscountCalculator;

  test.beforeEach(() => {
    calculator = new VolumeDiscountCalculator(DEFAULT_VOLUME_TIERS);
  });

  test('should apply no discount for small quantities', () => {
    const result = calculator.calculateDiscount(10, 10.00);

    expect(result.tier?.label).toBe('Small Batch');
    expect(result.discountPercent).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.discountedUnitPrice).toBe(10.00);
    expect(result.total).toBe(100.00);
  });

  test('should apply 10% discount for 25-99 copies', () => {
    const result = calculator.calculateDiscount(50, 10.00);

    expect(result.tier?.label).toBe('Standard');
    expect(result.discountPercent).toBe(10);
    expect(result.discount).toBe(50.00); // 10% of $500
    expect(result.discountedUnitPrice).toBe(9.00);
    expect(result.total).toBe(450.00);
  });

  test('should apply 15% discount for 100-499 copies', () => {
    const result = calculator.calculateDiscount(100, 10.00);

    expect(result.tier?.label).toBe('Bulk');
    expect(result.discountPercent).toBe(15);
    expect(result.discount).toBe(150.00); // 15% of $1000
    expect(result.discountedUnitPrice).toBe(8.50);
    expect(result.total).toBe(850.00);
  });

  test('should apply 20% discount for 500+ copies', () => {
    const result = calculator.calculateDiscount(500, 10.00);

    expect(result.tier?.label).toBe('Volume');
    expect(result.discountPercent).toBe(20);
    expect(result.discount).toBe(1000.00); // 20% of $5000
    expect(result.discountedUnitPrice).toBe(8.00);
    expect(result.total).toBe(4000.00);
  });

  test('should generate pricing breakdown', () => {
    const breakdown = calculator.getPricingBreakdown(100, 10.00);

    expect(breakdown.quantity).toBe(100);
    expect(breakdown.originalUnitPrice).toBe(10.00);
    expect(breakdown.discountedUnitPrice).toBe(8.50);
    expect(breakdown.subtotal).toBe(1000.00);
    expect(breakdown.discount).toBe(150.00);
    expect(breakdown.total).toBe(850.00);
    expect(breakdown.savings).toBe(150.00);
    expect(breakdown.savingsPercent).toBe(15);
    expect(breakdown.tier?.label).toBe('Bulk');
  });

  test('should generate quote comparison for multiple quantities', () => {
    const comparison = calculator.generateQuoteComparison(10.00, [25, 50, 100, 500]);

    expect(comparison).toHaveLength(4);
    expect(comparison[0].discountPercent).toBe(10); // 25 copies
    expect(comparison[1].discountPercent).toBe(10); // 50 copies
    expect(comparison[2].discountPercent).toBe(15); // 100 copies
    expect(comparison[3].discountPercent).toBe(20); // 500 copies
  });
});

// =============================================================================
// BULK ORDER SERVICE TESTS
// =============================================================================

test.describe('Bulk Order Service', () => {
  let service: BulkOrderService;

  test.beforeEach(() => {
    service = new BulkOrderService();
  });

  test('should create bulk order with single item and shipment', async () => {
    const order = await service.create({
      userId: 'user-123',
      workspaceId: 'workspace-456',
      items: [
        {
          spec: createTestPrintSpec(),
          quantity: 100,
          unitPrice: 10.00
        }
      ],
      shipments: [
        {
          orderItemIndex: 0,
          shippingAddress: {
            name: 'John Doe',
            address1: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'US',
            email: 'john@example.com'
          },
          quantity: 100
        }
      ]
    });

    expect(order).toBeDefined();
    expect(order.id).toBeDefined();
    expect(order.userId).toBe('user-123');
    expect(order.workspaceId).toBe('workspace-456');
    expect(order.items).toHaveLength(1);
    expect(order.shipments).toHaveLength(1);
    expect(order.orderStatus).toBe('draft');
    expect(order.paymentStatus).toBe('pending');

    // Check pricing
    expect(order.items[0].quantity).toBe(100);
    expect(order.items[0].unitPrice).toBe(10.00);
    expect(order.items[0].subtotal).toBe(1000.00);
    expect(order.items[0].discount).toBe(150.00); // 15% discount for 100 copies
    expect(order.items[0].total).toBe(850.00);

    // Check totals
    expect(order.subtotal).toBe(1000.00);
    expect(order.discount).toBe(150.00);
    expect(order.shippingTotal).toBeGreaterThan(0);
    expect(order.total).toBeGreaterThan(850.00); // subtotal - discount + shipping
  });

  test('should create bulk order with multiple shipments', async () => {
    const order = await service.create({
      userId: 'user-123',
      items: [
        {
          spec: createTestPrintSpec(),
          quantity: 100,
          unitPrice: 10.00
        }
      ],
      shipments: [
        {
          orderItemIndex: 0,
          shippingAddress: {
            name: 'Warehouse A',
            address1: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'US',
            email: 'warehouse-a@example.com'
          },
          quantity: 60
        },
        {
          orderItemIndex: 0,
          shippingAddress: {
            name: 'Warehouse B',
            address1: '456 Oak Ave',
            city: 'Los Angeles',
            state: 'CA',
            postalCode: '90001',
            country: 'US',
            email: 'warehouse-b@example.com'
          },
          quantity: 40
        }
      ]
    });

    expect(order.shipments).toHaveLength(2);
    expect(order.shipments[0].quantity).toBe(60);
    expect(order.shipments[1].quantity).toBe(40);
    expect(order.items[0].quantity).toBe(100);
  });

  test('should reject order when shipment quantities do not match item quantity', async () => {
    await expect(
      service.create({
        userId: 'user-123',
        items: [
          {
            spec: createTestPrintSpec(),
            quantity: 100,
            unitPrice: 10.00
          }
        ],
        shipments: [
          {
            orderItemIndex: 0,
            shippingAddress: {
              name: 'Test Customer',
              address1: '123 Main St',
              city: 'Test City',
              state: 'TS',
              postalCode: '12345',
              country: 'US',
              email: 'test@example.com'
            },
            quantity: 50 // Only 50 when order is for 100
          }
        ]
      })
    ).rejects.toThrow(/do not match order quantity/);
  });

  test('should reject order with invalid shipping address', async () => {
    await expect(
      service.create({
        userId: 'user-123',
        items: [
          {
            spec: createTestPrintSpec(),
            quantity: 100,
            unitPrice: 10.00
          }
        ],
        shipments: [
          {
            orderItemIndex: 0,
            shippingAddress: {
              name: '', // Missing name
              address1: '123 Main St',
              city: 'Test City',
              state: 'TS',
              postalCode: '12345',
              country: 'US',
              email: 'test@example.com'
            },
            quantity: 100
          }
        ]
      })
    ).rejects.toThrow(/recipient name is required/);
  });

  test('should apply higher discount for larger quantities across multiple items', async () => {
    const order = await service.create({
      userId: 'user-123',
      items: [
        {
          spec: createTestPrintSpec(),
          quantity: 250,
          unitPrice: 10.00
        },
        {
          spec: createTestPrintSpec(),
          quantity: 250,
          unitPrice: 10.00
        }
      ],
      shipments: [
        {
          orderItemIndex: 0,
          shippingAddress: {
            name: 'Customer A',
            address1: '123 Main St',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'US',
            email: 'customer-a@example.com'
          },
          quantity: 250
        },
        {
          orderItemIndex: 1,
          shippingAddress: {
            name: 'Customer B',
            address1: '456 Oak Ave',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'US',
            email: 'customer-b@example.com'
          },
          quantity: 250
        }
      ]
    });

    // Each item gets 20% discount (500+ copies)
    expect(order.items[0].appliedTier?.label).toBe('Volume');
    expect(order.items[0].appliedTier?.discountPercent).toBe(20);
    expect(order.items[1].appliedTier?.label).toBe('Volume');
    expect(order.items[1].appliedTier?.discountPercent).toBe(20);

    // Total discount = 20% of $5000
    expect(order.discount).toBe(1000.00);
  });
});

// =============================================================================
// VOLUME PRICING CHART TESTS
// =============================================================================

test.describe('Volume Pricing Chart', () => {
  test('should generate pricing chart for standard quantities', () => {
    const chart = generateVolumePricingChart(10.00);

    expect(chart).toHaveLength(6); // Default quantities: 25, 50, 100, 250, 500, 1000

    // 25 copies - 10% discount
    expect(chart[0].quantity).toBe(25);
    expect(chart[0].unitPrice).toBe(9.00);
    expect(chart[0].total).toBe(225.00);
    expect(chart[0].savings).toBe(25.00);
    expect(chart[0].savingsPercent).toBe(10);

    // 500 copies - 20% discount
    expect(chart[4].quantity).toBe(500);
    expect(chart[4].unitPrice).toBe(8.00);
    expect(chart[4].total).toBe(4000.00);
    expect(chart[4].savings).toBe(1000.00);
    expect(chart[4].savingsPercent).toBe(20);
  });

  test('should generate custom pricing chart', () => {
    const chart = generateVolumePricingChart(15.00, [10, 100, 1000]);

    expect(chart).toHaveLength(3);
    expect(chart[0].quantity).toBe(10);
    expect(chart[1].quantity).toBe(100);
    expect(chart[2].quantity).toBe(1000);
  });
});

// =============================================================================
// BULK SAVINGS CALCULATION TESTS
// =============================================================================

test.describe('Bulk Savings Calculation', () => {
  test('should calculate total savings across multiple orders', async () => {
    const service = new BulkOrderService();

    const order1 = await service.create({
      userId: 'user-123',
      items: [{
        spec: createTestPrintSpec(),
        quantity: 100,
        unitPrice: 10.00
      }],
      shipments: [{
        orderItemIndex: 0,
        shippingAddress: {
          name: 'Customer 1',
          address1: '123 Main St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'US',
          email: 'customer1@example.com'
        },
        quantity: 100
      }]
    });

    const order2 = await service.create({
      userId: 'user-123',
      items: [{
        spec: createTestPrintSpec(),
        quantity: 500,
        unitPrice: 10.00
      }],
      shipments: [{
        orderItemIndex: 0,
        shippingAddress: {
          name: 'Customer 2',
          address1: '456 Oak Ave',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'US',
          email: 'customer2@example.com'
        },
        quantity: 500
      }]
    });

    const savings = calculateBulkSavings([order1, order2]);

    expect(savings.totalOrders).toBe(2);
    expect(savings.totalItems).toBe(600);
    expect(savings.totalSubtotal).toBe(6000.00); // $10 x 600
    expect(savings.totalDiscount).toBe(1150.00); // $150 (15% on 100) + $1000 (20% on 500)
    expect(savings.averageDiscountPercent).toBeCloseTo(19.17, 1);
  });
});

// =============================================================================
// CUSTOM DISCOUNT TIERS TESTS
// =============================================================================

test.describe('Custom Discount Tiers', () => {
  test('should support custom discount tiers', () => {
    const customTiers = [
      {
        minQuantity: 1,
        maxQuantity: 49,
        discountPercent: 0,
        discountType: 'percentage' as const,
        label: 'Retail'
      },
      {
        minQuantity: 50,
        discountPercent: 25,
        discountType: 'percentage' as const,
        label: 'Wholesale'
      }
    ];

    const calculator = new VolumeDiscountCalculator(customTiers);

    const result1 = calculator.calculateDiscount(25, 10.00);
    expect(result1.tier?.label).toBe('Retail');
    expect(result1.discountPercent).toBe(0);

    const result2 = calculator.calculateDiscount(50, 10.00);
    expect(result2.tier?.label).toBe('Wholesale');
    expect(result2.discountPercent).toBe(25);
    expect(result2.discount).toBe(125.00); // 25% of $500
  });

  test('should support fixed amount discounts', () => {
    const customTiers = [
      {
        minQuantity: 1,
        discountPercent: 0,
        discountType: 'fixed_amount' as const,
        discountAmount: 100.00,
        label: 'Fixed $100 off'
      }
    ];

    const calculator = new VolumeDiscountCalculator(customTiers);
    const result = calculator.calculateDiscount(50, 10.00);

    expect(result.discount).toBe(100.00);
    expect(result.total).toBe(400.00); // $500 - $100
  });

  test('should support unit price discounts', () => {
    const customTiers = [
      {
        minQuantity: 100,
        discountPercent: 0,
        discountType: 'unit_price' as const,
        discountAmount: 7.00, // Fixed unit price of $7
        label: 'Volume Pricing'
      }
    ];

    const calculator = new VolumeDiscountCalculator(customTiers);
    const result = calculator.calculateDiscount(100, 10.00);

    expect(result.discountedUnitPrice).toBe(7.00);
    expect(result.total).toBe(700.00); // 100 x $7
    expect(result.discount).toBe(300.00); // $1000 - $700
  });
});
