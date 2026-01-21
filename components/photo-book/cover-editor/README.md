# Photo Book Cover Editor

**Feature:** PB-009 - Cover Design Editor
**Priority:** P0
**Status:** ✅ Implemented

## Overview

The Photo Book Cover Editor allows users to create custom covers for their photo books with full control over layout, typography, photos, and styling. Includes live preview with print-ready safe zone guides.

## Features

- 📸 **Photo Selection**: Choose from uploaded project photos
- 🎨 **4 Layout Styles**: Full bleed, framed, top-image, bottom-image
- ✍️ **Typography Control**: Custom fonts, sizes, colors
- 🎭 **Photo Overlay**: Adjustable dark overlay for text readability
- 📏 **Safe Zone Guides**: Visual guides for bleed and safe areas
- 👁️ **Live Preview**: Real-time preview of cover design
- 💾 **Auto-save**: Save designs to database
- ✅ **Validation**: Enforces title, photo requirements

## Components

### PhotoBookCoverEditor

Main editor component with live preview and controls.

```tsx
import { PhotoBookCoverEditor } from '@/components/photo-book/cover-editor'

function CoverPage() {
  const [photos, setPhotos] = useState([...])

  const handleSave = async (design) => {
    await fetch(`/api/photo-book/projects/${projectId}/cover`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(design)
    })
  }

  return (
    <PhotoBookCoverEditor
      projectId="project-123"
      initialDesign={{
        title: 'Summer 2024',
        layout: 'full-bleed'
      }}
      availablePhotos={photos}
      onSave={handleSave}
    />
  )
}
```

## Design Object Structure

```typescript
interface PhotoBookCoverDesign {
  // Content
  title: string                    // Required, max 100 chars
  subtitle?: string                // Optional, max 150 chars
  author?: string                  // Optional, max 100 chars
  coverPhotoId: string | null      // Required, photo ID
  coverPhotoUrl?: string           // Photo URL for preview

  // Layout
  layout: 'full-bleed' | 'framed' | 'top-image' | 'bottom-image'
  textPosition: 'center' | 'top' | 'bottom'

  // Styling
  textColor: string                // Hex color, e.g., '#FFFFFF'
  overlayOpacity: number           // 0-100
  overlayColor: string             // Hex color, e.g., '#000000'

  // Typography
  titleFont: {
    family: string                 // Font name
    size: number                   // 24-96px
    weight: number                 // 100-900
  }
  subtitleFont: {
    family: string
    size: number                   // 14-72px
  }
}
```

## Layout Styles

### Full Bleed
Photo covers the entire front cover edge-to-edge.
- **Best for:** Bold, impactful covers
- **Text:** Overlaid on photo

### Framed
Photo has a border/margin around it.
- **Best for:** Classic, elegant look
- **Text:** Overlaid or in margin

### Top Image
Photo in top half, text in bottom half.
- **Best for:** Landscape orientation photos
- **Text:** Clear, readable in bottom section

### Bottom Image
Text in top half, photo in bottom half.
- **Best for:** Portrait orientation photos
- **Text:** Clear, readable in top section

## Safe Zones

### Bleed Zone (Red)
- **3mm from edge** (~5% on standard sizes)
- Everything outside will be trimmed
- Extend photos/backgrounds to bleed edge

### Safe Zone (Green)
- **6mm from trim** (~8% from each edge)
- Keep all text and important elements inside
- Prevents content being cut off

### Example Measurements (8x8" cover)
- Total size: 8" × 8"
- Bleed: 0.4" from edge (8.8" × 8.8" total)
- Safe zone: 0.64" from edge (6.72" × 6.72" safe area)

## API Endpoints

### Get Cover Design
```typescript
GET /api/photo-book/projects/[projectId]/cover

Response:
{
  cover: CoverDesignRow | null
}
```

### Save Cover Design
```typescript
PUT /api/photo-book/projects/[projectId]/cover

Body: PhotoBookCoverDesign

Response:
{
  cover: CoverDesignRow
}
```

### Delete Cover Design
```typescript
DELETE /api/photo-book/projects/[projectId]/cover

Response:
{
  success: true
}
```

## Database Schema

```sql
CREATE TABLE photo_book_covers (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES photo_book_projects(id) UNIQUE,

  -- Content
  title VARCHAR(100) NOT NULL,
  subtitle VARCHAR(150),
  author VARCHAR(100),
  cover_photo_id UUID REFERENCES photo_book_photos(id),

  -- Layout
  layout VARCHAR(50) NOT NULL,
  text_position VARCHAR(20) NOT NULL,

  -- Typography
  text_color VARCHAR(7) NOT NULL,
  title_font_family VARCHAR(50) NOT NULL,
  title_font_size INTEGER NOT NULL,
  title_font_weight INTEGER NOT NULL,
  subtitle_font_family VARCHAR(50) NOT NULL,
  subtitle_font_size INTEGER NOT NULL,

  -- Overlay
  overlay_opacity INTEGER NOT NULL CHECK (overlay_opacity >= 0 AND overlay_opacity <= 100),
  overlay_color VARCHAR(7) NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)
```

## Validation Rules

| Field | Rule |
|-------|------|
| title | Required, 1-100 characters |
| subtitle | Optional, max 150 characters |
| author | Optional, max 100 characters |
| coverPhotoId | Required |
| layout | One of: full-bleed, framed, top-image, bottom-image |
| textPosition | One of: center, top, bottom |
| textColor | Valid hex color (#RRGGBB) |
| overlayOpacity | 0-100 |
| overlayColor | Valid hex color (#RRGGBB) |
| titleFont.size | 24-96 |
| subtitleFont.size | 14-72 |
| titleFont.weight | 100-900 |

## Supported Fonts

- **Serif:** Georgia, Times New Roman, Garamond
- **Sans-serif:** Arial, Helvetica, Futura, Gill Sans

More fonts can be added by updating the `FONTS` array in `PhotoBookCoverEditor.tsx`.

## User Interface

### Tabs

1. **Content**: Title, subtitle, author text inputs
2. **Photo**: Grid of available photos to select from
3. **Layout**: Layout style and text position
4. **Style**: Typography, colors, overlay settings

### Controls

- **Live Preview**: Left side, updates in real-time
- **Safe Zone Toggle**: Show/hide print guidelines
- **Save Button**: Validates and saves to database

## Integration Example

```tsx
import { PhotoBookCoverEditor } from '@/components/photo-book/cover-editor'

export default function EditCoverPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState(null)
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    // Load project and photos
    fetch(`/api/photo-book/projects/${params.id}`)
      .then(res => res.json())
      .then(data => setProject(data.project))

    fetch(`/api/photo-book/projects/${params.id}/photos`)
      .then(res => res.json())
      .then(data => setPhotos(data.photos))
  }, [params.id])

  const handleSave = async (design) => {
    const response = await fetch(
      `/api/photo-book/projects/${params.id}/cover`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(design)
      }
    )

    if (response.ok) {
      alert('Cover saved successfully!')
    }
  }

  if (!project || photos.length === 0) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Design Your Cover</h1>

      <PhotoBookCoverEditor
        projectId={params.id}
        initialDesign={project.cover}
        availablePhotos={photos}
        onSave={handleSave}
      />
    </div>
  )
}
```

## File Structure

```
components/photo-book/cover-editor/
├── PhotoBookCoverEditor.tsx    # Main component
├── index.ts                    # Exports
└── README.md                   # This file

app/api/photo-book/projects/[projectId]/cover/
└── route.ts                    # API endpoints

supabase/migrations/
└── 20260121000011_add_photo_book_covers.sql

e2e/
└── photo-book-cover-editor.spec.ts
```

## Testing

Run tests:
```bash
npm run test:e2e -- photo-book-cover-editor
```

Test coverage:
- ✅ Component rendering
- ✅ Design object structure
- ✅ Layout validation
- ✅ Typography controls
- ✅ API integration
- ✅ Safe zone guides
- ✅ User experience

## Best Practices

### For Users
1. **Choose high-quality photos** for cover (300 DPI minimum)
2. **Keep text in safe zone** to avoid cropping
3. **Use overlay** if photo is busy (30-50% works well)
4. **Preview without safe zones** to see final result
5. **Test readability** with different overlay opacities

### For Developers
1. **Validate photo IDs** before allowing cover creation
2. **Enforce maximum dimensions** for text elements
3. **Sanitize user input** for XSS prevention
4. **Cache cover previews** for performance
5. **Provide undo/redo** functionality

## Future Enhancements

- [ ] Spine text for hardcover books
- [ ] Back cover design
- [ ] Multiple photo covers (collage style)
- [ ] Gradient overlays
- [ ] Custom font uploads
- [ ] AI-powered layout suggestions
- [ ] Template presets
- [ ] Export cover separately

## Related Features

- **PB-001:** Photo Drag-and-Drop Upload (provides photos)
- **PB-006:** Smart Auto-Layout Engine (interior layouts)
- **PB-007:** Photo Book Templates (template integration)
- **PB-010:** Print-Ready PDF Generation (uses cover design)
- **PB-017:** Preview Mode (shows cover + interior)

## Support

For issues or questions:
- Check E2E tests for usage examples
- Review API endpoint tests
- See integration example above
