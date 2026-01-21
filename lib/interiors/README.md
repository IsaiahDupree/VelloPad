# Stock Interior Library

Pre-approved interior PDF templates for cover-only notebook mode.

## Overview

The Stock Interior Library provides ready-to-print interior PDFs for notebooks, planners, and journals. These templates allow users to focus on customizing the cover while using professionally designed, print-ready interiors.

## Features

- 📚 **15+ Pre-designed Templates**: Wide variety of page styles
- ✅ **Print-Ready**: All templates at 300 DPI, CMYK, with proper bleed
- 📏 **Multiple Sizes**: 5.5x8.5" (pocket), 6x9" (standard), 8.5x11" (large)
- 🎨 **Various Styles**: Lined, dotted, blank, grid, planner, bullet journal, music, calendar
- 🔍 **Searchable**: Search by category, size, tags, or keywords

## Categories

### Lined Notebooks
- **College Ruled**: 0.28" line spacing
- **Wide Ruled**: 0.375" line spacing
- **Pocket**: Compact 5.5x8.5" format

### Dot Grid
- **Standard**: 0.2" dot spacing for bullet journaling
- **Large**: 0.25" spacing for design work

### Blank
- **Sketchbook**: 80lb paper for drawing
- **Art Journal**: Large format with heavy stock

### Grid
- **Quad Grid**: 0.25" squares for math/engineering
- **Engineering Grid**: 0.2" grid for technical drawings

### Planners
- **Weekly Planner**: 52-week layout
- **Daily Planner**: 365 pages, one per day

### Bullet Journal
- Pre-formatted with index, monthly pages, and dot grid

### Music Manuscript
- Standard and large format staff paper

### Calendar
- 12-month calendar with notes sections

## Usage

### Basic Example

```typescript
import { getAllStockInteriors, getStockInteriorById } from '@/lib/interiors/stock-library'

// Get all templates
const allInteriors = getAllStockInteriors()

// Get specific template
const template = getStockInteriorById('lined-6x9-college')
console.log(template.name) // "College Ruled Lined"
console.log(template.pageCount) // 100
console.log(template.pageSize) // "6x9"
```

### Filter by Category

```typescript
import { getStockInteriorsByCategory } from '@/lib/interiors/stock-library'

// Get all dotted templates
const dottedTemplates = getStockInteriorsByCategory('dotted')

// Get all planner templates
const planners = getStockInteriorsByCategory('planner')
```

### Search Templates

```typescript
import { searchStockInteriors } from '@/lib/interiors/stock-library'

// Search by keyword
const results = searchStockInteriors('bullet')
// Returns templates tagged with 'bullet'

const artResults = searchStockInteriors('art')
// Returns templates for art/drawing
```

### Get Popular Templates

```typescript
import { getPopularStockInteriors } from '@/lib/interiors/stock-library'

// Get most popular templates
const popular = getPopularStockInteriors()
// Returns templates marked as popular: true
```

### Filter by Page Size

```typescript
import { getStockInteriorsByPageSize } from '@/lib/interiors/stock-library'

// Get all 6x9 templates
const standard = getStockInteriorsByPageSize('6x9')

// Get pocket-sized templates
const pocket = getStockInteriorsByPageSize('5.5x8.5')
```

## Template Structure

Each template has the following properties:

```typescript
interface StockInterior {
  id: string                    // Unique identifier
  name: string                  // Display name
  description: string           // Description
  category: string              // Category (lined, dotted, etc.)
  pageCount: number             // Number of pages
  pageSize: string              // Page dimensions (e.g., '6x9')
  paperWeight: string           // Paper weight (e.g., '60lb')
  lineSpacing?: string          // For lined pages
  dotSpacing?: string           // For dotted pages
  gridSize?: string             // For grid pages
  color: 'white' | 'cream' | 'gray'
  printReady: boolean
  pdfUrl?: string               // URL to PDF file
  thumbnailUrl?: string         // Preview image
  metadata: {
    dpi: number
    colorSpace: string
    bleed: string
    margins: {
      top: string
      bottom: string
      left: string
      right: string
    }
  }
  tags: string[]
  popular: boolean
  createdAt: string
}
```

## Print Specifications

All templates meet professional print standards:

- **Resolution**: 300 DPI minimum
- **Color Space**: CMYK
- **Bleed**: 0.125" (3mm) on all sides
- **Safe Zone**: Margins vary by template
- **Paper Weights**: 60lb-80lb depending on use case

## Page Sizes

| Size | Dimensions | Common Use |
|------|-----------|-----------|
| Pocket | 5.5" × 8.5" | Portable notebooks |
| Standard | 6" × 9" | Books, journals |
| Large | 8.5" × 11" | Planners, workbooks |

## Integration with Notebook Adapter

Use with the Notebook Adapter for cover-only mode:

```typescript
import { getStockInteriorById } from '@/lib/interiors/stock-library'

// Select interior template
const interior = getStockInteriorById('lined-6x9-college')

// Pass to notebook adapter (PM-002: Cover-Only Adapter)
const notebook = {
  interiorType: 'stock',
  interiorId: interior.id,
  pageCount: interior.pageCount,
  pageSize: interior.pageSize,
  // ... cover design options
}
```

## Adding New Templates

To add a new stock interior:

1. Design the template following print specifications
2. Generate print-ready PDF
3. Upload PDF to storage
4. Add entry to `STOCK_INTERIORS` array:

```typescript
{
  id: 'my-new-template',
  name: 'My Template',
  description: 'Description here',
  category: 'lined',
  pageCount: 100,
  pageSize: '6x9',
  paperWeight: '60lb',
  lineSpacing: '0.28in',
  color: 'white',
  printReady: true,
  pdfUrl: 'https://storage.example.com/templates/my-template.pdf',
  thumbnailUrl: 'https://storage.example.com/templates/my-template-thumb.jpg',
  metadata: {
    dpi: 300,
    colorSpace: 'CMYK',
    bleed: '0.125in',
    margins: {
      top: '0.75in',
      bottom: '0.75in',
      left: '1.25in',
      right: '0.75in'
    }
  },
  tags: ['custom', 'tag'],
  popular: false,
  createdAt: new Date().toISOString()
}
```

## Best Practices

### Choosing Templates

1. **Match Use Case**: Select category based on intended use
2. **Page Count**: Consider how many pages user needs
3. **Paper Weight**: Heavier stock for art, lighter for notes
4. **Size**: Pocket for portability, large for workspace use

### Quality Considerations

- All templates are print-safe at 300+ DPI
- CMYK color space ensures accurate print colors
- Proper bleed prevents white edges
- Margins ensure content isn't cut off

### Template Combinations

Templates can be mixed with:
- Custom cover designs (BS-304)
- Tenant-specific branding (MT-003)
- Product mode adapters (PM-002)

## Future Enhancements

Potential additions to the library:

- Habit trackers
- Goal setting templates
- Recipe notebooks
- Travel journals
- Prayer journals (tenant-specific)
- Sermon note templates
- Bible study guides
- Teacher planners
- Fitness trackers

## Related Features

- **PM-001**: Notebook Adapter Interface
- **PM-002**: Cover-Only Notebook Adapter
- **PM-003**: Custom Interior Notebook Adapter
- **BS-304**: Cover Basics (cover design)
- **MT-006**: Tenant Template Overrides

## Support

For questions about stock interiors:
- Check the template metadata for specifications
- Test with Prodigi or other POD providers
- Verify bleed and margins meet provider requirements
