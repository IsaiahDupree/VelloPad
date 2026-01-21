# Notebook Adapter System

Flexible adapter interface for different notebook product modes: cover-only, custom interior, and blank notebooks.

## Overview

The Notebook Adapter system provides a unified interface for creating various types of printed products. Each adapter implements specific capabilities and integrates with print-on-demand providers.

## Architecture

```
┌─────────────────────────────────────┐
│    Notebook Adapter Interface       │
│  (Base capabilities & methods)      │
└─────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼──────┐    ┌──────▼─────────┐
│  Cover-Only  │    │ Custom Interior│
│   Adapter    │    │    Adapter     │
│  (PM-002)    │    │   (PM-003)     │
└──────────────┘    └────────────────┘
        │                   │
        └─────────┬─────────┘
                  │
        ┌─────────▼──────────┐
        │  Print Providers   │
        │ (Prodigi, Gelato)  │
        └────────────────────┘
```

## Product Modes

### 1. Cover-Only Mode (PM-002)
Users customize the cover, uses pre-approved stock interior PDF.

**Use Cases:**
- Lined notebooks
- Dot grid journals
- Planners with standard layouts
- Quick turnaround products

**Features:**
- Choose from stock interior library
- Focus on cover design
- Faster production
- Lower complexity

### 2. Custom Interior Mode (PM-003)
Users design individual pages with custom layouts and content.

**Use Cases:**
- Custom planners
- Prayer journals with prompts
- Recipe books
- Educational workbooks

**Features:**
- Page-by-page editing
- Custom layouts
- Text and image placement
- Full creative control

### 3. Blank Mode
Simple blank notebooks with customized covers.

**Use Cases:**
- Sketchbooks
- Art journals
- Minimalist notebooks

## Core Interfaces

### NotebookAdapter

```typescript
interface NotebookAdapter {
  // Identification
  readonly name: string
  readonly version: string
  readonly productMode: 'cover-only' | 'custom-interior' | 'blank'

  // Capabilities
  getCapabilities(): ProductCapabilities
  getAssetRequirements(): AssetRequirements

  // Validation
  validateSpec(spec: ProductSpec): { valid: boolean, errors: string[] }
  preflight(spec: ProductSpec, assets: Assets): Promise<PreflightResult>

  // Pricing & Ordering
  getQuote(request: QuoteRequest): Promise<QuoteResponse>
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>
  getOrderStatus(orderId: string): Promise<OrderStatusUpdate>
}
```

### ProductCapabilities

Defines what features a product mode supports:

```typescript
interface ProductCapabilities {
  // Cover
  supportsCoverDesign: boolean
  supportsCustomCoverImage: boolean
  supportsTextOnCover: boolean

  // Interior
  supportsCoverOnly: boolean
  supportsCustomInterior: boolean
  supportsBlankInterior: boolean

  // Physical options
  supportedBindings: BindingType[]
  allowedPageSizes: PageSize[]
  allowedPageCounts: number[] | { min: number, max: number }
  allowedPaperTypes: PaperType[]

  // Quality
  minimumDPI: number
  requiresBleed: boolean
  requiresPrintReadyPDF: boolean

  // Integration
  compatibleProviders: string[]
}
```

## Usage Examples

### Create Cover-Only Notebook

```typescript
import { CoverOnlyAdapter } from '@/lib/adapters/cover-only-adapter'
import { getStockInteriorById } from '@/lib/interiors/stock-library'

const adapter = new CoverOnlyAdapter()

// Get stock interior
const interior = getStockInteriorById('lined-6x9-college')

// Build product spec
const spec: ProductSpec = {
  productMode: 'cover-only',
  pageSize: '6x9',
  bindingType: 'perfect_bound',
  pageCount: interior.pageCount,
  paperType: 'standard-white',
  coverDesign: {
    title: 'My Journal',
    author: 'Jane Doe',
    frontImage: 'https://storage.example.com/cover.jpg'
  },
  interior: {
    type: 'stock',
    stockInteriorId: interior.id
  },
  printSpec: {
    colorMode: 'color',
    finish: 'matte'
  }
}

// Validate
const validation = adapter.validateSpec(spec)
if (!validation.valid) {
  console.error(validation.errors)
}

// Get quote
const quote = await adapter.getQuote({
  productSpec: spec,
  quantity: 1,
  shippingAddress: {
    country: 'US',
    postalCode: '10001'
  }
})

console.log(`Price: $${quote.totalCost}`)
```

### Preflight Check

```typescript
// Run preflight checks before ordering
const preflightResult = await adapter.preflight(spec, {
  coverPdfUrl: 'https://storage.example.com/cover.pdf',
  interiorPdfUrl: 'https://storage.example.com/interior.pdf'
})

if (!preflightResult.passed) {
  console.log('Errors:', preflightResult.errors)
  console.log('Warnings:', preflightResult.warnings)
}

// Check individual components
console.log('Cover PDF:', preflightResult.checks.coverPdf.passed)
console.log('Interior PDF:', preflightResult.checks.interiorPdf.passed)
console.log('Specifications:', preflightResult.checks.specifications.passed)
```

### Create Order

```typescript
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
    coverPdfUrl: 'https://storage.example.com/cover.pdf',
    interiorPdfUrl: 'https://storage.example.com/interior.pdf'
  }
})

console.log('Order ID:', order.orderId)
console.log('Status:', order.status)
```

### Track Order Status

```typescript
const status = await adapter.getOrderStatus(order.providerOrderId)

console.log('Status:', status.status)
console.log('Tracking:', status.trackingNumber)
console.log('Estimated delivery:', status.estimatedDeliveryDate)
```

## Product Specifications

### Page Sizes

| Size | Dimensions | Use Case |
|------|-----------|----------|
| 5x8 | 5" × 8" | Compact notebook |
| 5.5x8.5 | 5.5" × 8.5" | Pocket planner |
| 6x9 | 6" × 9" | Standard notebook |
| 8.5x11 | 8.5" × 11" | Large workbook |
| A4 | 210mm × 297mm | European standard |
| A5 | 148mm × 210mm | Compact European |

### Binding Types

- **perfect_bound**: Glued spine, professional look
- **saddle_stitch**: Stapled, good for thin books
- **spiral**: Wire spiral, lays flat
- **coil**: Plastic coil binding
- **wire-o**: Double wire binding
- **layflat**: Special binding that stays open
- **hardcover**: Rigid cover boards

### Paper Types

- **standard-white**: 60lb white offset
- **cream**: 60lb cream/ivory
- **premium-white**: 70-80lb white
- **recycled**: Eco-friendly paper
- **heavyweight**: 80lb+ for art

## Validation

### Spec Validation

Adapters validate product specifications against their capabilities:

```typescript
const validation = adapter.validateSpec(spec)

if (!validation.valid) {
  validation.errors.forEach(error => {
    console.error(error)
  })
}
```

Common validation errors:
- Unsupported page size
- Invalid page count
- Incompatible binding type
- Missing required assets

### Preflight Checks

Comprehensive pre-print validation:

```typescript
const preflight = await adapter.preflight(spec, assets)

// Check specific issues
preflight.errors.forEach(error => {
  console.log(`[${error.code}] ${error.message}`)
  if (error.suggestion) {
    console.log(`  Suggestion: ${error.suggestion}`)
  }
})

preflight.warnings.forEach(warning => {
  console.log(`[${warning.code}] ${warning.message}`)
})
```

Common preflight issues:
- Low resolution images (< 300 DPI)
- Missing bleed area
- Content in unsafe zones
- Invalid PDF format
- Incorrect page dimensions

## Extending the System

### Create Custom Adapter

```typescript
import { BaseNotebookAdapter, ProductCapabilities } from '@/lib/adapters/notebook-adapter'

export class MyCustomAdapter extends BaseNotebookAdapter {
  readonly name = 'My Custom Adapter'
  readonly version = '1.0.0'
  readonly productMode = 'custom-interior'

  getCapabilities(): ProductCapabilities {
    return {
      supportsCoverDesign: true,
      supportsCustomCoverImage: true,
      supportsTextOnCover: true,
      supportsCoverOnly: false,
      supportsCustomInterior: true,
      supportsBlankInterior: false,
      supportedBindings: ['perfect_bound', 'spiral'],
      allowedPageSizes: ['6x9', '8.5x11'],
      allowedPageCounts: { min: 24, max: 200 },
      allowedPaperTypes: ['standard-white', 'cream'],
      minimumDPI: 300,
      requiresBleed: true,
      requiresPrintReadyPDF: true,
      compatibleProviders: ['prodigi']
    }
  }

  getAssetRequirements(): AssetRequirements {
    return {
      coverImage: {
        required: true,
        minWidth: 1800,
        minHeight: 2700,
        minDPI: 300,
        acceptedFormats: ['jpg', 'png', 'pdf']
      },
      interiorImages: {
        required: false,
        maxCount: 100,
        minDPI: 300,
        acceptedFormats: ['jpg', 'png']
      }
    }
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    // Implementation
  }

  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    // Implementation
  }

  async getOrderStatus(orderId: string): Promise<OrderStatusUpdate> {
    // Implementation
  }
}
```

## Integration with Print Providers

Adapters abstract provider-specific details:

```typescript
// Adapter handles provider integration
const adapter = new CoverOnlyAdapter({
  provider: 'prodigi',
  apiKey: process.env.PRODIGI_API_KEY
})

// Same interface works with different providers
const gelatoAdapter = new CoverOnlyAdapter({
  provider: 'gelato',
  apiKey: process.env.GELATO_API_KEY
})
```

## Best Practices

### 1. Always Validate

```typescript
// Validate before processing
const validation = adapter.validateSpec(spec)
if (!validation.valid) {
  throw new Error(validation.errors.join(', '))
}
```

### 2. Run Preflight Checks

```typescript
// Check before ordering
const preflight = await adapter.preflight(spec, assets)
if (!preflight.passed) {
  // Handle errors
  return { success: false, errors: preflight.errors }
}
```

### 3. Handle Async Operations

```typescript
// Use try-catch for async operations
try {
  const order = await adapter.createOrder(request)
  return order
} catch (error) {
  console.error('Order failed:', error)
  throw error
}
```

### 4. Check Capabilities

```typescript
// Verify feature support
const capabilities = adapter.getCapabilities()
if (!capabilities.supportsSpiral) {
  console.log('Spiral binding not available')
}
```

## Testing

### Unit Tests

```typescript
describe('CoverOnlyAdapter', () => {
  it('validates page size', () => {
    const adapter = new CoverOnlyAdapter()
    const spec = createSpec({ pageSize: '6x9' })
    const result = adapter.validateSpec(spec)
    expect(result.valid).toBe(true)
  })

  it('rejects invalid page count', () => {
    const adapter = new CoverOnlyAdapter()
    const spec = createSpec({ pageCount: 10 }) // Too few
    const result = adapter.validateSpec(spec)
    expect(result.valid).toBe(false)
  })
})
```

### Integration Tests

```typescript
describe('Adapter Integration', () => {
  it('creates order with Prodigi', async () => {
    const adapter = new CoverOnlyAdapter({ provider: 'prodigi' })
    const order = await adapter.createOrder(validRequest)
    expect(order.orderId).toBeDefined()
    expect(order.status).toBe('pending')
  })
})
```

## Related Features

- **PM-002**: Cover-Only Notebook Adapter
- **PM-003**: Custom Interior Notebook Adapter
- **PM-004**: Stock Interior Library
- **BS-601**: Print Orchestrator Service
- **BS-602**: Provider Adapter v1 (Prodigi)

## Troubleshooting

### Common Issues

**"Page size not supported"**
- Check `allowedPageSizes` in capabilities
- Verify provider supports the size

**"Invalid page count"**
- Check `allowedPageCounts` range
- Some bindings have minimum/maximum pages

**"Preflight failed: Low DPI"**
- Images must be 300+ DPI for print
- Check `minimumDPI` in capabilities

**"Order creation failed"**
- Verify API credentials
- Check preflight passed
- Ensure assets are accessible
