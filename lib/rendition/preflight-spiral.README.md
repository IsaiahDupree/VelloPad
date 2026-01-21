# Spiral Binding Preflight Checks

Specialized preflight validation for spiral, coil, and wire-o binding notebooks.

## Overview

Spiral binding has unique requirements compared to perfect binding:
- **Holes are punched** along the binding edge, obscuring content
- **Larger margins required** on binding edge (0.5" minimum, 0.75" recommended)
- **Bleed is critical** on binding edge to prevent white gaps
- **Wire size limits** page count capacity

## Usage

### Basic Usage

```typescript
import {
  getSpiralConfigForPageSize,
  runSpiralPreflightChecks,
  getSpiralPreflightSummary
} from '@/lib/rendition/preflight-spiral'

// Get configuration for page size
const config = getSpiralConfigForPageSize('6x9', 'spiral')

// Run all preflight checks
const checks = runSpiralPreflightChecks({
  config,
  imageDPI: 300,
  contentMargins: {
    top: 0.75,
    bottom: 0.75,
    left: 0.75,
    right: 0.5
  }
})

// Get summary
const summary = getSpiralPreflightSummary(checks)

if (!summary.passed) {
  console.error(`Preflight failed with ${summary.totalErrors} errors`)
  summary.criticalIssues.forEach(issue => console.error(issue))
}
```

### Individual Checks

```typescript
import {
  checkBindingMargin,
  checkBleedZones,
  checkDPIRequirements,
  checkWireSizeCompatibility,
  checkSafeZone
} from '@/lib/rendition/preflight-spiral'

// Check binding margins
const marginCheck = checkBindingMargin(config)
if (!marginCheck.passed) {
  marginCheck.errors.forEach(error => {
    console.error(error.message)
  })
}

// Check bleed zones
const bleedCheck = checkBleedZones(config)

// Check DPI
const dpiCheck = checkDPIRequirements(config, 300)

// Check wire size for page count
const wireCheck = checkWireSizeCompatibility(config)

// Check content safe zone
const safeZoneCheck = checkSafeZone(config, {
  top: 0.75,
  bottom: 0.75,
  left: 0.75,
  right: 0.5
})
```

### Custom Configuration

```typescript
import { DEFAULT_SPIRAL_CONFIG, type SpiralBindingConfig } from '@/lib/rendition/preflight-spiral'

const customConfig: SpiralBindingConfig = {
  ...DEFAULT_SPIRAL_CONFIG,
  pageSize: '8.5x11',
  pageCount: 150,
  bindingType: 'coil',
  wireSize: '2:1',
  minimumBindingMargin: 0.625,
  recommendedMargin: 0.875
}
```

## Spiral Binding Requirements

### Margins

| Binding Edge | Minimum | Recommended | Safe Zone |
|-------------|---------|-------------|-----------|
| Left/Right  | 0.5"    | 0.75"       | 0.625"    |
| Top/Bottom  | 0.5"    | 0.75"       | 0.625"    |

**Note**: Larger page sizes (8.5x11) require larger margins (0.625" min, 0.875" recommended)

### Bleed

- **Required**: 0.125" bleed on all edges
- **Critical**: Bleed on binding edge prevents white gaps between holes
- Without bleed, white paper shows through spiral holes

### Wire Sizes

#### 3:1 Pitch (3 holes per inch)
- **Best for**: 20-120 pages
- **Wire diameter**: 0.25"-0.5"
- **Hole size**: Smaller, more professional look
- **Use case**: Standard notebooks, journals

#### 2:1 Pitch (2 holes per inch)
- **Best for**: 80-250 pages
- **Wire diameter**: 0.5"-1"
- **Hole size**: Larger, sturdier
- **Use case**: Thick planners, textbooks

### DPI Requirements

- **Minimum**: 300 DPI (same as perfect binding)
- **Critical threshold**: 150 DPI (will fail preflight)
- **Recommended**: 300-600 DPI for images near binding edge

## Preflight Checks

### 1. Binding Margin Check
Validates margins on binding edge meet minimum requirements.

**Failures:**
- Margin < 0.375" → Critical error (content obscured)
- Margin < recommended → Warning

### 2. Bleed Zone Check
Ensures proper bleed for clean edge appearance.

**Failures:**
- No bleed on binding edge → Error
- Bleed < 0.125" → Warning

### 3. DPI Requirements Check
Validates image quality for print.

**Failures:**
- DPI < 150 → Error (very poor quality)
- DPI < 300 → Warning (below recommended)

### 4. Wire Size Compatibility Check
Ensures page count is appropriate for wire size.

**Failures:**
- Page count > wire max capacity → Error
- Page count < wire min recommendation → Warning

### 5. Safe Zone Check
Verifies content is positioned away from spiral holes.

**Failures:**
- Content < minimum margin → Error
- Content < safe zone → Warning

## Examples

### Valid Configuration

```typescript
{
  bindingType: 'spiral',
  wireSize: '3:1',
  bindingEdge: 'left',
  pageSize: '6x9',
  pageCount: 100,
  minimumBindingMargin: 0.75,    // Good margin
  minimumSafeZone: 0.625,
  requiresBleed: true,
  bleedSize: '0.125in',
  minimumDPI: 300
}
```

✅ All checks pass

### Invalid Configuration

```typescript
{
  bindingType: 'spiral',
  wireSize: '3:1',
  bindingEdge: 'left',
  pageSize: '6x9',
  pageCount: 150,                 // ❌ Too many pages for 3:1 wire
  minimumBindingMargin: 0.25,     // ❌ Too small, content will be obscured
  minimumSafeZone: 0.625,
  requiresBleed: false,           // ❌ Bleed required for spiral
  bleedSize: '0',
  minimumDPI: 300
}
```

❌ Preflight fails with 3 errors

## Integration

### With Notebook Adapters

```typescript
import { CoverOnlyAdapter } from '@/lib/adapters/cover-only-adapter'
import {
  getSpiralConfigForPageSize,
  runSpiralPreflightChecks
} from '@/lib/rendition/preflight-spiral'

const adapter = new CoverOnlyAdapter()

// When binding type is spiral/coil/wire-o
if (['spiral', 'coil', 'wire-o'].includes(spec.bindingType)) {
  const spiralConfig = getSpiralConfigForPageSize(spec.pageSize, spec.bindingType)
  spiralConfig.pageCount = spec.pageCount

  const spiralChecks = runSpiralPreflightChecks({
    config: spiralConfig,
    imageDPI: 300
  })

  // Add spiral checks to overall preflight result
}
```

### With Rendition Pipeline

```typescript
import { runSpiralPreflightChecks } from '@/lib/rendition/preflight-spiral'

async function preflightRendition(renditionId: string) {
  const rendition = await getRendition(renditionId)

  if (rendition.bindingType === 'spiral') {
    const spiralChecks = runSpiralPreflightChecks({
      config: {
        ...rendition.specs,
        bindingType: 'spiral'
      }
    })

    // Merge with other preflight checks
  }
}
```

## Common Issues

### Issue: Content Too Close to Binding Edge
**Cause**: Margin < 0.5" on binding edge
**Fix**: Increase margin to 0.75" recommended

### Issue: White Gaps at Spiral Holes
**Cause**: Missing or insufficient bleed
**Fix**: Add 0.125" bleed on binding edge

### Issue: Too Many Pages for Wire
**Cause**: Page count > wire capacity
**Fix**: Use larger wire (2:1 instead of 3:1) or reduce pages

### Issue: Low Image Quality
**Cause**: DPI < 300
**Fix**: Use higher resolution images or scale down image size

## Best Practices

1. **Always use recommended margins** (0.75") even if minimum (0.5") technically works
2. **Include bleed on all edges**, especially binding edge
3. **Choose wire size based on page count** - don't overpack
4. **Test with physical sample** if possible before full production run
5. **Keep important content in safe zone** (0.625" from binding edge)
