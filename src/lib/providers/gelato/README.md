# Gelato Provider Integration

**Feature:** PB-032 - Gelato Integration
**Priority:** P1
**Purpose:** Backup print provider for EU fulfillment

## Overview

Gelato is a global print-on-demand provider with fulfillment centers across Europe, North America, and Asia-Pacific. This integration provides:

- **European fulfillment** with faster shipping and lower costs for EU customers
- **Global coverage** with 130+ production partners in 32 countries
- **Competitive pricing** especially for EU/UK markets
- **High quality** photo books, hardcover books, and notebooks

## Architecture

The Gelato integration follows the PrintProviderAdapter interface:

```
lib/providers/gelato/
├── types.ts          # Gelato API types
├── client.ts         # REST API client
├── adapter.ts        # PrintProviderAdapter implementation
├── index.ts          # Public exports
└── README.md         # This file
```

## Setup

### 1. Environment Variables

Add to `.env.local`:

```bash
GELATO_API_KEY=your_api_key_here
GELATO_ENVIRONMENT=sandbox  # or 'production'
```

### 2. Register Adapter

```typescript
import { getPrintOrchestrator } from '@/lib/print/orchestrator'
import { createGelatoAdapter } from '@/lib/providers/gelato'

const orchestrator = getPrintOrchestrator()
const gelatoAdapter = createGelatoAdapter()

// Register as backup provider (not default)
orchestrator.registerAdapter(gelatoAdapter, false)
```

## Usage

### Get Quote

```typescript
const quotes = await orchestrator.getQuotes({
  spec: {
    productType: 'photo_book',
    trimSize: { width: 10, height: 10, unit: 'in' },
    pageCount: 50,
    binding: 'hardcover',
    paperType: 'premium',
    colorSpace: 'RGB',
    interiorPdfUrl: 'https://...',
    coverPdfUrl: 'https://...'
  },
  quantity: 1,
  destinationCountry: 'DE'
}, ['gelato'])
```

### Create Order

```typescript
const result = await orchestrator.createOrder({
  spec: { /* ... */ },
  quantity: 1,
  shippingAddress: { /* ... */ },
  shippingMethod: 'standard',
  bookId: 'book_123',
  workspaceId: 'ws_123',
  userId: 'user_123',
  renditionId: 'rend_123'
}, 'gelato')
```

## Supported Products

### Photo Books

| Size | Binding | Min Pages | Max Pages | Product UID |
|------|---------|-----------|-----------|-------------|
| 8x8" | Hardcover | 20 | 200 | `photobook_hardcover_200x200_20-200` |
| 8x8" | Softcover | 20 | 200 | `photobook_softcover_200x200_20-200` |
| 8x8" | Layflat | 20 | 120 | `photobook_layflat_200x200_20-120` |
| 10x10" | Hardcover | 20 | 200 | `photobook_hardcover_250x250_20-200` |
| 10x10" | Softcover | 20 | 200 | `photobook_softcover_250x250_20-200` |
| 10x10" | Layflat | 20 | 120 | `photobook_layflat_250x250_20-120` |
| 12x12" | Hardcover | 20 | 200 | `photobook_hardcover_300x300_20-200` |
| 12x12" | Softcover | 20 | 200 | `photobook_softcover_300x300_20-200` |
| 12x12" | Layflat | 20 | 120 | `photobook_layflat_300x300_20-120` |
| 8.5x11" | Hardcover | 20 | 200 | `photobook_hardcover_216x279_20-200` |
| 8.5x11" | Softcover | 20 | 200 | `photobook_softcover_216x279_20-200` |

## Capabilities

- **Product Types:** Photo books, books, notebooks
- **Bindings:** Hardcover, softcover, perfect bound, layflat
- **Page Count:** 20-200 pages (20-120 for layflat)
- **Color Spaces:** RGB, CMYK
- **Tracking:** Yes
- **Webhooks:** Yes
- **Bulk Orders:** Yes

## Webhooks

Gelato sends webhooks for order status updates:

### Event Types

- `order.created` - Order created
- `order.updated` - Status updated
- `order.shipped` - Order shipped with tracking
- `order.delivered` - Order delivered
- `order.cancelled` - Order cancelled

### Webhook Endpoint

Set up webhook URL in Gelato dashboard:

```
https://vellopad.com/api/webhooks/gelato
```

### Implementation

See `app/api/webhooks/gelato/route.ts` for webhook handler.

## Error Handling

```typescript
try {
  const order = await gelatoAdapter.createOrder(request)
  if (!order.success) {
    console.error('Order failed:', order.error)
  }
} catch (error) {
  console.error('Gelato API error:', error)
}
```

## Testing

Run E2E tests:

```bash
npm run test:e2e -- gelato-integration.spec.ts
```

## Provider Selection Strategy

Use Gelato when:

1. **Customer is in EU/UK** - Lower shipping costs and faster delivery
2. **Prodigi unavailable** - Automatic failover (see PB-034)
3. **Price comparison** - Sometimes cheaper for certain configurations

The orchestrator's `getQuotes()` method automatically compares all providers.

## Links

- [Gelato API Docs](https://www.gelato.com/docs/api/)
- [Product Catalog](https://www.gelato.com/products)
- [Pricing Calculator](https://www.gelato.com/pricing)
- [Dashboard](https://dashboard.gelato.com)

## Related Features

- **BS-601:** Print Orchestrator Service
- **PB-013:** Prodigi API Integration (primary provider)
- **PB-033:** Multi-Provider Price Comparison
- **PB-034:** Provider Failover System
