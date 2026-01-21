# Product Mode Capabilities

This module defines capabilities for different product modes in VelloPad.

## Overview

Product capabilities define what features and specifications are supported for each product mode:
- Cover-Only: User customizes cover, uses stock interior
- Custom Interior: User designs custom page layouts
- Photo Book: Specialized for photo books
- Spiral Notebook: Specific requirements for spiral binding
- Hardcover: Premium hardcover books

## Usage

### Get Capabilities for a Product Mode

```typescript
import { getCapabilitiesForMode } from '@/lib/adapters/capabilities'

const capabilities = getCapabilitiesForMode('cover-only')

console.log(capabilities.supportsCoverOnly) // true
console.log(capabilities.allowedPageSizes) // ['5x8', '5.5x8.5', '6x9', ...]
```

### Check if Features are Supported

```typescript
import {
  isBindingSupported,
  isPageSizeSupported,
  isPageCountValid,
  isPaperTypeSupported,
  isProviderCompatible
} from '@/lib/adapters/capabilities'

// Check binding support
if (isBindingSupported('spiral', 'coil')) {
  console.log('Coil binding is supported for spiral notebooks')
}

// Check page size
if (isPageSizeSupported('photo-book', '8x10')) {
  console.log('8x10 is supported for photo books')
}

// Check page count
if (isPageCountValid('custom-interior', 250)) {
  console.log('250 pages is valid for custom interior')
}

// Check paper type
if (isPaperTypeSupported('hardcover', 'premium-white')) {
  console.log('Premium white paper is supported')
}

// Check provider compatibility
if (isProviderCompatible('photo-book', 'prodigi')) {
  console.log('Prodigi supports photo books')
}
```

### Get Allowed Page Counts

```typescript
import { getAllowedPageCounts } from '@/lib/adapters/capabilities'

const pageCounts = getAllowedPageCounts('cover-only')
console.log(pageCounts) // [80, 100, 120, 150, 180, 200, 240]
```

### Get Minimum DPI

```typescript
import { getMinimumDPI } from '@/lib/adapters/capabilities'

const minDPI = getMinimumDPI('photo-book')
console.log(minDPI) // 300
```

## Capability Definitions

### Cover-Only Mode

- **Supports**: Stock interiors only
- **Bindings**: Perfect bound, saddle stitch, spiral, coil, wire-o
- **Page Sizes**: 5x8, 5.5x8.5, 6x9, 8.5x11, A5, A4
- **Page Counts**: Fixed options (80, 100, 120, 150, 180, 200, 240)
- **Paper Types**: Standard white, cream, premium white
- **Providers**: Prodigi, Gelato, Lulu, Peecho

### Custom Interior Mode

- **Supports**: Custom page layouts and blank pages
- **Bindings**: All bindings including layflat
- **Page Sizes**: 5x8, 5.5x8.5, 6x9, 7x10, 8x10, 8.5x11, A4, A5
- **Page Counts**: Range (24-500 pages)
- **Paper Types**: All types including recycled and heavyweight
- **Providers**: Prodigi, Gelato, Lulu, Peecho

### Photo Book Mode

- **Supports**: Custom interior with images
- **Bindings**: Hardcover, perfect bound, layflat
- **Page Sizes**: 8x10, 8.5x11
- **Page Counts**: Range (20-100 pages)
- **Paper Types**: Premium white, heavyweight
- **Providers**: Prodigi, Gelato

### Spiral Notebook Mode

- **Supports**: Cover-only, custom interior, blank pages
- **Bindings**: Spiral, coil, wire-o
- **Page Sizes**: 5.5x8.5, 6x9, 8.5x11, A4, A5
- **Page Counts**: Fixed options (80, 100, 120, 150, 200)
- **Paper Types**: Standard white, cream, premium white
- **Providers**: Prodigi, Peecho

### Hardcover Book Mode

- **Supports**: Custom interior only
- **Bindings**: Hardcover, layflat
- **Page Sizes**: 5x8, 6x9, 7x10, 8x10, 8.5x11, A4, A5
- **Page Counts**: Range (24-800 pages)
- **Paper Types**: Standard white, cream, premium white, heavyweight
- **Providers**: Prodigi, Gelato, Lulu

## Integration with Adapters

Product mode adapters should use these capabilities to validate product specifications:

```typescript
import { BaseNotebookAdapter } from './notebook-adapter'
import { COVER_ONLY_CAPABILITIES } from './capabilities'

export class CoverOnlyAdapter extends BaseNotebookAdapter {
  readonly name = 'cover-only'
  readonly version = '1.0.0'
  readonly productMode = 'cover-only' as const

  getCapabilities() {
    return COVER_ONLY_CAPABILITIES
  }

  // ... implement other methods
}
```

## Extending Capabilities

To add a new product mode:

1. Define capabilities constant
2. Add to `getCapabilitiesForMode()` switch statement
3. Update utility functions to support new mode
4. Create corresponding adapter

Example:

```typescript
export const MY_NEW_MODE_CAPABILITIES: ProductCapabilities = {
  // ... define capabilities
}

// Add to getCapabilitiesForMode()
case 'my-new-mode':
  return MY_NEW_MODE_CAPABILITIES
```
