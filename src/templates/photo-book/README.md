# Photo Book Templates

**Feature:** PB-007 - Photo Book Templates
**Priority:** P0
**Status:** ✅ Implemented

## Overview

Pre-built photo book templates that define the overall style and layout approach for a photo book. Each template includes specific aesthetic rules, layout preferences, and use-case guidance.

## Templates

### 1. Classic Album
**Style:** Traditional and timeless
**Photos per page:** 1-4
**Best for:** Family albums, weddings, graduations

**Characteristics:**
- Clean, symmetric layouts
- Consistent spacing
- Professional appearance
- No rotation or asymmetry

**Photo capacity:** 20-200 photos

---

### 2. Dynamic Collage
**Style:** Creative and energetic
**Photos per page:** 3-9
**Best for:** Vacations, events, school yearbooks

**Characteristics:**
- Multiple photos per page
- Dynamic arrangements
- Space-efficient
- Allows asymmetry

**Photo capacity:** 50-300 photos

---

### 3. Magazine Editorial
**Style:** Professional and bold
**Photos per page:** 1-3
**Best for:** Portfolios, lookbooks, catalogs

**Characteristics:**
- Editorial layouts
- Bold compositions
- Generous white space
- Asymmetric emphasis

**Photo capacity:** 15-100 photos

---

### 4. Minimalist Gallery
**Style:** Clean and elegant
**Photos per page:** 1-2
**Best for:** Fine art, coffee table books

**Characteristics:**
- Maximum white space
- Gallery-quality presentation
- Elegant simplicity
- Premium feel

**Photo capacity:** 10-60 photos

---

## Usage

### TypeScript/JavaScript

```typescript
import {
  getAllTemplates,
  getTemplateById,
  getRecommendedTemplate
} from '@/src/templates/photo-book'

// Get all available templates
const templates = getAllTemplates()

// Get specific template
const classic = getTemplateById('classic')

// Get recommendation based on photo count
const recommended = getRecommendedTemplate(75) // Returns 'classic'
```

### React Component

```tsx
import { TemplateSelector } from '@/components/photo-book/TemplateSelector'

function PhotoBookWizard() {
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  return (
    <TemplateSelector
      photoCount={50}
      selectedTemplateId="classic"
      onSelect={(template) => setSelectedTemplate(template)}
      showRecommendation={true}
    />
  )
}
```

### API Endpoint

```typescript
// Get all templates
GET /api/templates/photo-book

// Get specific template
GET /api/templates/photo-book?id=classic

// Get templates for photo count
GET /api/templates/photo-book?photoCount=75

// Get popular templates
GET /api/templates/photo-book?popular=4
```

## Template Selection Logic

### Automatic Recommendations

Based on photo count:
- **1-30 photos:** Minimalist (focus on quality)
- **31-60 photos:** Magazine (editorial style)
- **61-100 photos:** Classic (traditional album)
- **100+ photos:** Collage (space-efficient)

### Compatibility Check

Each template specifies a photo range:
```typescript
{
  photoRange: { min: 20, max: 200 }
}
```

The UI automatically disables incompatible templates.

## Template Structure

```typescript
interface PhotoBookTemplate {
  id: string                    // Unique identifier
  name: string                  // Display name
  description: string           // Full description
  style: LayoutStyle            // Layout engine style
  features: string[]            // Key features
  bestFor: string[]            // Use cases
  layouts: LayoutTemplate[]     // Available layouts
  photoRange: {                 // Photo capacity
    min: number
    max: number
  }
  popularity: number            // Sort order
}
```

## Integration with Layout Engine

Templates are tightly integrated with the layout engine:

```typescript
import { generateLayout } from '@/lib/layout-engine'

const template = getTemplateById('classic')

const result = generateLayout(photos, {
  pageSize: '8x8',
  layoutStyle: template.style,  // Uses template style
  photosPerPage: { min: 1, max: 4 },
  preserveOrder: true
})
```

## File Structure

```
src/templates/photo-book/
├── index.ts                 # Template definitions & utilities
└── README.md               # This file

components/photo-book/
└── TemplateSelector.tsx    # React component

app/api/templates/photo-book/
└── route.ts                # API endpoint
```

## Future Enhancements

- [ ] Custom template creation
- [ ] Template marketplace
- [ ] Seasonal template packs
- [ ] User-uploaded templates
- [ ] Template preview images
- [ ] A/B testing for recommendations

## Related Features

- **PB-006:** Smart Auto-Layout Engine (uses template styles)
- **PB-009:** Cover Design Editor (will use template branding)
- **PB-019:** Manual Layout Adjustment (overrides templates)

## Testing

E2E tests located at: `e2e/photo-book-templates.spec.ts`

Run tests:
```bash
npm run test:e2e -- photo-book-templates
```
