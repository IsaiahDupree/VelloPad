/**
 * E2E Tests for Custom Interior Adapter
 * Feature: PM-003 - Custom Interior Notebook Adapter
 */

import { test, expect, describe } from '@playwright/test'
import {
  CustomInteriorAdapter,
  type PageLayout,
  type TextElement,
  type ImageElement
} from '@/lib/adapters/custom-interior-adapter'
import type { ProductSpec } from '@/lib/adapters/notebook-adapter'

describe('PM-003: Custom Interior Notebook Adapter', () => {
  let adapter: CustomInteriorAdapter

  test.beforeEach(() => {
    adapter = new CustomInteriorAdapter()
  })

  describe('Adapter Initialization', () => {
    test('should initialize with default config', () => {
      expect(adapter.name).toBe('custom-interior')
      expect(adapter.version).toBe('1.0.0')
      expect(adapter.productMode).toBe('custom-interior')
    })

    test('should accept custom configuration', () => {
      const customAdapter = new CustomInteriorAdapter({
        defaultProvider: 'gelato',
        pricing: {
          coverCostBase: 3.00,
          interiorCostPerPage: 0.06,
          customLayoutMultiplier: 1.3,
          bindingCosts: {
            'perfect_bound': 0.60
          }
        }
      })

      expect(customAdapter.name).toBe('custom-interior')
    })
  })

  describe('Capabilities', () => {
    test('should return correct capabilities', () => {
      const capabilities = adapter.getCapabilities()

      expect(capabilities.supportsCustomInterior).toBe(true)
      expect(capabilities.supportsCoverOnly).toBe(false)
      expect(capabilities.supportsBlankInterior).toBe(true)
      expect(capabilities.supportsSpiral).toBe(true)
      expect(capabilities.supportsLayflat).toBe(true)
      expect(capabilities.minimumDPI).toBe(300)
      expect(capabilities.requiresBleed).toBe(true)
    })

    test('should support multiple binding types', () => {
      const capabilities = adapter.getCapabilities()

      expect(capabilities.supportedBindings).toContain('perfect_bound')
      expect(capabilities.supportedBindings).toContain('spiral')
      expect(capabilities.supportedBindings).toContain('layflat')
    })

    test('should support flexible page counts', () => {
      const capabilities = adapter.getCapabilities()

      expect(capabilities.allowedPageCounts).toHaveProperty('min')
      expect(capabilities.allowedPageCounts).toHaveProperty('max')
      expect((capabilities.allowedPageCounts as any).min).toBe(24)
      expect((capabilities.allowedPageCounts as any).max).toBe(500)
    })
  })

  describe('Asset Requirements', () => {
    test('should define cover requirements', () => {
      const requirements = adapter.getAssetRequirements()

      expect(requirements.coverImage?.required).toBe(true)
      expect(requirements.coverImage?.minDPI).toBe(300)
      expect(requirements.coverImage?.acceptedFormats).toContain('pdf')
      expect(requirements.coverImage?.acceptedFormats).toContain('jpg')
    })

    test('should allow interior images', () => {
      const requirements = adapter.getAssetRequirements()

      expect(requirements.interiorImages?.required).toBe(false)
      expect(requirements.interiorImages?.maxCount).toBeGreaterThan(0)
      expect(requirements.interiorImages?.minDPI).toBe(300)
    })

    test('should indicate generated interior', () => {
      const requirements = adapter.getAssetRequirements()

      expect(requirements.stockInterior?.required).toBe(false)
      expect(requirements.stockInterior?.source).toBe('generate')
    })
  })

  describe('Spec Validation', () => {
    test('should validate valid custom interior spec', () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 100,
        paperType: 'standard-white',
        coverDesign: {
          title: 'My Custom Planner',
          author: 'Jane Doe',
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'custom',
          customContent: {
            pages: Array.from({ length: 100 }, (_, i) => ({
              pageNumber: i + 1,
              elements: []
            }))
          }
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const result = adapter.validateSpec(spec)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should validate blank interior spec', () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'spiral',
        pageCount: 80,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'blank'
        },
        printSpec: {
          colorMode: 'bw',
          finish: 'uncoated'
        }
      }

      const result = adapter.validateSpec(spec)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should reject stock interior type', () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 100,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'stock',
          stockInteriorId: 'lined-6x9'
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const result = adapter.validateSpec(spec)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('Custom interior mode requires interior type to be "custom" or "blank"'))
    })

    test('should require cover image', () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 100,
        paperType: 'standard-white',
        coverDesign: {},
        interior: {
          type: 'blank'
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const result = adapter.validateSpec(spec)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Front cover image is required')
    })

    test('should validate page count for saddle stitch', () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'saddle_stitch',
        pageCount: 100, // Too many for saddle stitch
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'blank'
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const result = adapter.validateSpec(spec)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Saddle stitch binding supports maximum 80 pages')
    })

    test('should validate minimum pages for perfect bound', () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 20, // Too few for perfect bound
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'blank'
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const result = adapter.validateSpec(spec)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Perfect bound requires minimum 24 pages')
    })
  })

  describe('Custom Content Validation', () => {
    test('should require pages array', () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 50,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'custom',
          customContent: {} // Missing pages
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const result = adapter.validateSpec(spec)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Custom content must include a pages array')
    })

    test('should validate page structure', () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 50,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'custom',
          customContent: {
            pages: [
              { pageNumber: 1, elements: [] },
              { elements: [] } // Missing pageNumber
            ]
          }
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const result = adapter.validateSpec(spec)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('pageNumber is required'))).toBe(true)
    })

    test('should validate text elements', () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 50,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'custom',
          customContent: {
            pages: [
              {
                pageNumber: 1,
                elements: [
                  {
                    type: 'text',
                    id: 'text1'
                    // Missing content
                  }
                ]
              }
            ]
          }
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const result = adapter.validateSpec(spec)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('text content is required'))).toBe(true)
    })

    test('should validate image elements', () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 50,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'custom',
          customContent: {
            pages: [
              {
                pageNumber: 1,
                elements: [
                  {
                    type: 'image',
                    id: 'img1'
                    // Missing imageUrl
                  }
                ]
              }
            ]
          }
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const result = adapter.validateSpec(spec)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('imageUrl is required'))).toBe(true)
    })

    test('should enforce image count limits', () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 50,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'custom',
          customContent: {
            pages: [
              {
                pageNumber: 1,
                elements: Array.from({ length: 15 }, (_, i) => ({
                  type: 'image',
                  id: `img${i}`,
                  imageUrl: `https://example.com/img${i}.jpg`,
                  x: 0,
                  y: 0,
                  width: 100,
                  height: 100
                }))
              }
            ]
          }
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const result = adapter.validateSpec(spec)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true)
    })
  })

  describe('Preflight Checks', () => {
    test('should pass preflight for valid blank interior', async () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 100,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'blank'
        },
        printSpec: {
          colorMode: 'bw',
          finish: 'uncoated'
        }
      }

      const assets = {
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: 'https://example.com/interior.pdf'
      }

      const result = await adapter.preflight(spec, assets)

      expect(result.passed).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should detect page count mismatch', async () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 100,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'custom',
          customContent: {
            pages: Array.from({ length: 50 }, (_, i) => ({
              pageNumber: i + 1,
              elements: []
            }))
          }
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const assets = {
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: 'https://example.com/interior.pdf'
      }

      const result = await adapter.preflight(spec, assets)

      expect(result.passed).toBe(false)
      expect(result.errors.some(e => e.code === 'PAGE_COUNT_MISMATCH')).toBe(true)
    })

    test('should detect missing pages', async () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 50,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'custom',
          customContent: {
            pages: [
              { pageNumber: 1, elements: [] },
              { pageNumber: 2, elements: [] },
              // Missing pages 3-49
              { pageNumber: 50, elements: [] }
            ]
          }
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const assets = {
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: 'https://example.com/interior.pdf'
      }

      const result = await adapter.preflight(spec, assets)

      expect(result.passed).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_PAGES')).toBe(true)
    })

    test('should detect duplicate pages', async () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 50,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'custom',
          customContent: {
            pages: [
              ...Array.from({ length: 48 }, (_, i) => ({ pageNumber: i + 1, elements: [] })),
              { pageNumber: 50, elements: [] },
              { pageNumber: 50, elements: [] } // Duplicate
            ]
          }
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const assets = {
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: 'https://example.com/interior.pdf'
      }

      const result = await adapter.preflight(spec, assets)

      expect(result.passed).toBe(false)
      expect(result.errors.some(e => e.code === 'DUPLICATE_PAGES')).toBe(true)
    })

    test('should warn about spiral binding margins', async () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'spiral',
        pageCount: 80,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'blank'
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const assets = {
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: 'https://example.com/interior.pdf'
      }

      const result = await adapter.preflight(spec, assets)

      expect(result.warnings.some(w => w.code === 'SPIRAL_BINDING_MARGINS')).toBe(true)
    })

    test('should require interior PDF', async () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 100,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'blank'
        },
        printSpec: {
          colorMode: 'bw',
          finish: 'uncoated'
        }
      }

      const assets = {
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: '' // Missing
      }

      const result = await adapter.preflight(spec, assets)

      expect(result.passed).toBe(false)
      expect(result.errors.some(e => e.code === 'INTERIOR_PDF_REQUIRED')).toBe(true)
    })
  })

  describe('Quote Generation', () => {
    test('should generate quote for custom interior', async () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 100,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'custom',
          customContent: {
            pages: Array.from({ length: 100 }, (_, i) => ({ pageNumber: i + 1, elements: [] }))
          }
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const quote = await adapter.getQuote({
        productSpec: spec,
        quantity: 1,
        shippingAddress: {
          country: 'US',
          postalCode: '10001'
        }
      })

      expect(quote.provider).toBe('prodigi')
      expect(quote.productionCost).toBeGreaterThan(0)
      expect(quote.shippingCost).toBeGreaterThan(0)
      expect(quote.totalCost).toBe(quote.productionCost + quote.shippingCost)
      expect(quote.currency).toBe('USD')
      expect(quote.estimatedProductionDays).toBe(5)
      expect(quote.metadata?.productMode).toBe('custom-interior')
      expect(quote.metadata?.breakdown?.customLayoutPremium).toBeGreaterThan(0)
    })

    test('should generate quote for blank interior', async () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'spiral',
        pageCount: 80,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'blank'
        },
        printSpec: {
          colorMode: 'bw',
          finish: 'uncoated'
        }
      }

      const quote = await adapter.getQuote({
        productSpec: spec,
        quantity: 1,
        shippingAddress: {
          country: 'US',
          postalCode: '10001'
        }
      })

      expect(quote.totalCost).toBeGreaterThan(0)
      expect(quote.metadata?.breakdown?.customLayoutPremium).toBe(0)
    })

    test('should calculate bulk pricing', async () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 100,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'blank'
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const quote1 = await adapter.getQuote({
        productSpec: spec,
        quantity: 1,
        shippingAddress: { country: 'US', postalCode: '10001' }
      })

      const quote10 = await adapter.getQuote({
        productSpec: spec,
        quantity: 10,
        shippingAddress: { country: 'US', postalCode: '10001' }
      })

      expect(quote10.productionCost).toBeGreaterThan(quote1.productionCost * 5)
      expect(quote10.productionCost).toBeLessThan(quote1.productionCost * 15)
    })
  })

  describe('Order Creation', () => {
    test('should create order successfully', async () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 100,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'custom',
          customContent: {
            pages: Array.from({ length: 100 }, (_, i) => ({ pageNumber: i + 1, elements: [] }))
          }
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      const order = await adapter.createOrder({
        productSpec: spec,
        quantity: 1,
        shippingAddress: {
          name: 'Jane Doe',
          line1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US'
        },
        shippingMethod: 'standard',
        assets: {
          coverPdfUrl: 'https://example.com/cover.pdf',
          interiorPdfUrl: 'https://example.com/interior.pdf'
        }
      })

      expect(order.orderId).toBeDefined()
      expect(order.providerOrderId).toBeDefined()
      expect(order.status).toBe('pending')
      expect(order.provider).toBe('prodigi')
      expect(order.metadata?.productMode).toBe('custom-interior')
    })

    test('should fail without interior PDF', async () => {
      const spec: ProductSpec = {
        productMode: 'custom-interior',
        pageSize: '6x9',
        bindingType: 'perfect_bound',
        pageCount: 100,
        paperType: 'standard-white',
        coverDesign: {
          frontImage: 'https://example.com/cover.jpg'
        },
        interior: {
          type: 'blank'
        },
        printSpec: {
          colorMode: 'color',
          finish: 'matte'
        }
      }

      await expect(adapter.createOrder({
        productSpec: spec,
        quantity: 1,
        shippingAddress: {
          name: 'Jane Doe',
          line1: '123 Main St',
          city: 'New York',
          postalCode: '10001',
          country: 'US'
        },
        shippingMethod: 'standard',
        assets: {
          coverPdfUrl: 'https://example.com/cover.pdf',
          interiorPdfUrl: '' // Missing
        }
      })).rejects.toThrow('Preflight failed')
    })
  })

  describe('Order Status', () => {
    test('should get order status', async () => {
      const status = await adapter.getOrderStatus('prodigi-123456')

      expect(status.orderId).toBe('prodigi-123456')
      expect(status.status).toBeDefined()
      expect(status.metadata?.productMode).toBe('custom-interior')
    })
  })

  describe('Interior PDF Generation', () => {
    test('should throw error for unimplemented generation', async () => {
      const content = {
        pages: [
          { pageNumber: 1, elements: [] }
        ]
      }

      await expect(adapter.generateInteriorPdf(content)).rejects.toThrow('Interior PDF generation not yet implemented')
    })
  })
})
