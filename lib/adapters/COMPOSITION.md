# Print Provider Adapter Composition System

## Overview

The adapter composition system allows VelloPad to combine **product mode adapters** (which define what users can customize) with **print provider adapters** (which handle actual printing) to create a flexible, extensible printing pipeline.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ComposedAdapter                         │
│                                                             │
│  ┌──────────────────────┐      ┌─────────────────────────┐ │
│  │  Product Adapter     │      │  Print Provider Adapter │ │
│  │                      │      │                         │ │
│  │  • CoverOnlyAdapter  │──+──>│  • ProdigiAdapter       │ │
│  │  • CustomInterior    │      │  • GelatoAdapter        │ │
│  │  • BlankNotebook     │      │  • LuluAdapter          │ │
│  └──────────────────────┘      └─────────────────────────┘ │
│                                                             │
│  Capabilities ◄─── Product Adapter                         │
│  Validation   ◄─── Product Adapter + Provider Adapter      │
│  Quote        ◄─── Product → Print Transformation          │
│  Order        ◄─── Product → Print Transformation          │
│  Status       ◄─── Print Provider Adapter                  │
└─────────────────────────────────────────────────────────────┘
```

## Key Concepts

### 1. Product Mode Adapters

Define **what** users can customize:

- **CoverOnlyAdapter**: User designs cover, uses pre-approved stock interior PDF
- **CustomInteriorAdapter**: User edits pages (planner layouts, prompts, etc.)
- **BlankNotebookAdapter**: Simple blank pages with cover

Each product adapter:
- Defines capabilities (supported sizes, bindings, page counts)
- Validates product specifications
- Provides preflight checks
- Manages product-specific assets (stock interiors, templates)

### 2. Print Provider Adapters

Handle **how** products are actually printed:

- **ProdigiAdapter**: Prodigi API integration
- **GelatoAdapter**: Gelato API integration
- **LuluAdapter**: Lulu API integration
- **PeechoAdapter**: Peecho API integration

Each print adapter:
- Communicates with provider API
- Maps canonical specs to provider-specific formats
- Handles quoting, ordering, tracking
- Manages provider webhooks and status updates

### 3. Composed Adapter

Bridges the gap between product and provider:

- Translates product specs to print specs
- Coordinates validation between both adapters
- Routes quote/order requests appropriately
- Aggregates preflight checks from both sources

## Usage Examples

### Basic Composition

```typescript
import { createCoverOnlyAdapter } from '@/lib/adapters/cover-only-adapter'
import { ProdigiAdapter } from '@/lib/print/adapters/prodigi'
import { composeAdapters } from '@/lib/adapters/composer'

// Create individual adapters
const productAdapter = createCoverOnlyAdapter()
const printAdapter = new ProdigiAdapter({ apiKey: process.env.PRODIGI_API_KEY })

// Compose them
const adapter = composeAdapters(productAdapter, printAdapter)

// Now use the composed adapter
const quote = await adapter.getQuote({
  productSpec: {
    productMode: 'cover-only',
    pageSize: '6x9',
    bindingType: 'spiral',
    pageCount: 120,
    paperType: 'standard-white',
    coverDesign: {
      frontImage: 'https://...',
      title: 'My Prayer Journal',
      author: 'Jane Doe'
    },
    interior: {
      type: 'stock',
      stockInteriorId: 'dotted-120-6x9'
    },
    printSpec: {
      colorMode: 'bw',
      finish: 'matte'
    }
  },
  quantity: 50,
  shippingAddress: {
    country: 'US',
    postalCode: '10001'
  }
})

console.log(`Quote: $${quote.totalCost} for ${quote.estimatedProductionDays + quote.estimatedShippingDays} days`)
```

### Multi-Provider Quoting

Get quotes from multiple providers and select the best one:

```typescript
import { composeWithMultipleProviders, selectBestAdapter } from '@/lib/adapters/composer'
import { ProdigiAdapter } from '@/lib/print/adapters/prodigi'
import { GelatoAdapter } from '@/lib/print/adapters/gelato'

const productAdapter = createCoverOnlyAdapter()

// Create compositions with multiple providers
const composers = composeWithMultipleProviders(productAdapter, [
  new ProdigiAdapter({ apiKey: process.env.PRODIGI_API_KEY }),
  new GelatoAdapter({ apiKey: process.env.GELATO_API_KEY })
])

// Get best quote by price
const { adapter, quote } = await selectBestAdapter(
  composers,
  quoteRequest,
  'price' // Options: 'price' | 'speed' | 'quality'
)

console.log(`Best provider: ${adapter.name}`)
console.log(`Cost: $${quote.totalCost}`)
console.log(`Delivery: ${quote.estimatedProductionDays + quote.estimatedShippingDays} days`)
```

### Order Flow

```typescript
// Preflight check
const preflightResult = await adapter.preflight(productSpec, {
  coverPdfUrl: 'https://storage.../cover.pdf',
  interiorPdfUrl: 'https://storage.../interior.pdf'
})

if (!preflightResult.passed) {
  console.error('Preflight failed:', preflightResult.errors)
  return
}

// Create order
const order = await adapter.createOrder({
  productSpec,
  quantity: 50,
  shippingAddress: {
    name: 'Jane Doe',
    line1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
    phone: '+1-555-0100'
  },
  shippingMethod: 'standard',
  assets: {
    coverPdfUrl: 'https://storage.../cover.pdf',
    interiorPdfUrl: 'https://storage.../interior.pdf'
  }
})

console.log(`Order created: ${order.providerOrderId}`)
console.log(`Status: ${order.status}`)
console.log(`Estimated delivery: ${order.estimatedDeliveryDate}`)
```

### Status Tracking

```typescript
// Poll for status updates
const status = await adapter.getOrderStatus(order.providerOrderId)

console.log(`Order status: ${status.status}`)
if (status.trackingNumber) {
  console.log(`Tracking: ${status.trackingNumber}`)
}
```

## Spec Transformation

The composer automatically transforms product specs to print specs:

### Input (Product Spec)
```typescript
{
  productMode: 'cover-only',
  pageSize: '6x9',           // Simple string format
  bindingType: 'spiral',     // Product-friendly name
  paperType: 'cream',
  coverDesign: { ... },
  interior: {
    type: 'stock',
    stockInteriorId: 'dotted-120-6x9'
  }
}
```

### Output (Print Spec)
```typescript
{
  productType: 'notebook',
  trimSize: {
    width: 6,                // Parsed dimensions
    height: 9,
    unit: 'in'
  },
  binding: 'spiral',         // Canonical format
  paperType: 'standard',     // Mapped to provider option
  coverPdfUrl: 'https://...',
  interiorPdfUrl: 'https://storage.../dotted-120-6x9.pdf'  // Resolved from stock library
}
```

## Capabilities Intersection

The composed adapter advertises only capabilities supported by **both** the product adapter and print provider:

```typescript
const capabilities = adapter.getCapabilities()

// Example result:
{
  supportsCoverDesign: true,              // From product adapter
  supportsCustomInterior: false,          // Product adapter limitation
  supportedBindings: ['spiral', 'coil'],  // Intersection of both
  allowedPageSizes: ['6x9', '8.5x11'],   // Both support these
  compatibleProviders: ['prodigi']        // Print provider
}
```

## Validation & Preflight

Validation happens at two levels:

### 1. Product Validation
- Stock interior exists and matches spec
- Cover design is complete
- Page count matches stock interior
- Binding is appropriate for product mode

### 2. Provider Validation
- Provider supports the trim size
- Page count within provider limits (24-600)
- File URLs are accessible
- Binding type supported by provider

### Combined Preflight
```typescript
const result = await adapter.preflight(productSpec, assets)

// Result includes checks from both adapters:
{
  passed: false,
  errors: [
    {
      code: 'STOCK_INTERIOR_NOT_FOUND',
      severity: 'error',
      message: 'Stock interior "dotted-120-6x9" not found'
    },
    {
      code: 'PROVIDER_VALIDATION_ERROR',
      severity: 'error',
      message: 'Page count (500) exceeds maximum (400)'
    }
  ],
  warnings: [
    {
      code: 'SPIRAL_BINDING_MARGINS',
      severity: 'warning',
      message: 'Spiral binding requires 0.5" margin on binding edge'
    }
  ]
}
```

## Benefits

### 1. Flexibility
Mix and match product modes with print providers without changing application code.

### 2. Extensibility
Add new product modes or print providers independently:
- Add `GelatoAdapter` → works with all existing product adapters
- Add `CalendarAdapter` → works with all existing print providers

### 3. Multi-Provider Support
Get quotes from multiple providers and select best option automatically.

### 4. Unified Interface
Application code uses a single `NotebookAdapter` interface regardless of the underlying composition.

### 5. Validation Layering
Catch issues at both product and provider levels before submitting orders.

## Best Practices

### 1. Always Preflight Before Ordering
```typescript
const preflight = await adapter.preflight(spec, assets)
if (!preflight.passed) {
  // Show errors to user, don't proceed
  return
}
```

### 2. Cache Composed Adapters
Don't create new compositions for every request:
```typescript
// BAD
const adapter = composeAdapters(productAdapter, printAdapter)
const quote = await adapter.getQuote(...)

// GOOD
const adapters = new Map()
adapters.set('cover-only+prodigi', composeAdapters(...))

const adapter = adapters.get('cover-only+prodigi')
const quote = await adapter.getQuote(...)
```

### 3. Handle Provider Unavailability
```typescript
const composers = composeWithMultipleProviders(productAdapter, providers)

try {
  const { adapter, quote } = await selectBestAdapter(composers, request, 'price')
} catch (error) {
  if (error.message.includes('No print providers available')) {
    // All providers failed - show maintenance message
  }
}
```

### 4. Use Metadata for Tracking
```typescript
const order = await adapter.createOrder({
  ...request,
  metadata: {
    userId: user.id,
    bookId: book.id,
    campaignId: 'spring-2026',
    source: 'web-app'
  }
})
```

## Future Enhancements

- [ ] Add caching layer for capabilities/quotes
- [ ] Implement retry logic for transient failures
- [ ] Add circuit breaker for failing providers
- [ ] Support composite orders (multiple products, multiple providers)
- [ ] Add cost estimation without calling provider APIs
- [ ] Implement provider health checks and automatic failover

## Related Files

- `lib/adapters/notebook-adapter.ts` - Base notebook adapter interface
- `lib/adapters/cover-only-adapter.ts` - Cover-only product adapter
- `lib/adapters/capabilities.ts` - Capability definitions
- `lib/print/orchestrator.ts` - Print orchestrator and provider interface
- `lib/print/adapters/prodigi.ts` - Prodigi provider adapter
- `lib/interiors/stock-library.ts` - Stock interior PDF library
