# MT-005: Tenant Collections

Manages curated product collections per tenant. Collections allow admins to showcase featured books and orders on their tenant's homepage and other strategic locations.

## Features

- **Create/Read/Update/Delete Collections** - Full CRUD operations
- **Add/Remove Items** - Add books or orders to collections
- **Reordering** - Drag-and-drop reorder items
- **Featured Collections** - Designate collections for homepage display
- **Visibility Controls** - Toggle collections on/off

## Database Schema

### tenant_collections
Main collection table with metadata and display settings.

```sql
CREATE TABLE tenant_collections (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,          -- Which tenant owns this
  name text NOT NULL,                -- Display name
  slug text NOT NULL,                -- URL-safe slug
  description text,                  -- Marketing description
  category text,                     -- (faith, business, etc)
  cover_image_url text,              -- Collection cover
  featured_book_ids uuid[],          -- Denormalized for speed
  featured_order_ids uuid[],         -- Denormalized for speed
  display_order integer,             -- Sort order
  is_visible boolean,                -- Overall visibility
  show_in_home boolean,              -- Show on homepage
  show_in_sidebar boolean,           -- Show in sidebar nav
  metadata jsonb,                    -- Custom data
  created_at, updated_at
);
```

### tenant_collection_items
Individual items that belong to a collection.

```sql
CREATE TABLE tenant_collection_items (
  id uuid PRIMARY KEY,
  collection_id uuid NOT NULL,       -- Parent collection
  book_id uuid,                      -- Featured book OR
  order_id uuid,                     -- Featured order (but not both)
  position integer NOT NULL,         -- Order in collection
  created_at
);
```

## Usage Examples

### Create a Collection

```typescript
import { createTenantCollection } from '@/lib/tenant/collections'

const collection = await createTenantCollection({
  tenant_id: 'faith-tenant-id',
  name: 'Faith Leaders',
  slug: 'faith-leaders',
  description: 'Books from our faith leaders',
  category: 'featured',
  show_in_home: true,
  display_order: 1
})
```

### Add a Book to a Collection

```typescript
import { addCollectionItem } from '@/lib/tenant/collections'

await addCollectionItem({
  collection_id: collection.id,
  book_id: 'book-uuid'
})
```

### Get Featured Collections for Homepage

```typescript
import { getFeaturedCollections } from '@/lib/tenant/collections'

const featured = await getFeaturedCollections(tenantId)
// Returns collections with show_in_home = true
```

### Reorder Items

```typescript
import { reorderCollectionItems } from '@/lib/tenant/collections'

const itemIds = ['item-1', 'item-2', 'item-3']
await reorderCollectionItems(collectionId, itemIds)
```

### Get All Items in a Collection

```typescript
import { getCollectionItems } from '@/lib/tenant/collections'

const items = await getCollectionItems(collectionId)
// Returns items with book/order details populated
```

## API Patterns

### List Collections

```typescript
GET /api/tenants/[tenantId]/collections
```

Response:
```json
{
  "collections": [
    {
      "id": "uuid",
      "name": "Faith Leaders",
      "slug": "faith-leaders",
      "description": "...",
      "cover_image_url": "...",
      "item_count": 5
    }
  ]
}
```

### Get Collection Details

```typescript
GET /api/tenants/[tenantId]/collections/[collectionId]
```

Response:
```json
{
  "collection": { ... },
  "items": [
    {
      "position": 1,
      "book_id": "uuid",
      "book_title": "Faith Foundations",
      "book_cover_url": "...",
      "order_id": null
    },
    {
      "position": 2,
      "book_id": null,
      "order_id": "uuid",
      "order_user_email": "user@example.com",
      "order_total": 24.99
    }
  ]
}
```

### Create Collection

```typescript
POST /api/tenants/[tenantId]/collections

{
  "name": "Best Sellers",
  "slug": "best-sellers",
  "description": "Our most popular books",
  "show_in_home": true
}
```

### Add Item to Collection

```typescript
POST /api/tenants/[tenantId]/collections/[collectionId]/items

{
  "book_id": "uuid"  // or "order_id": "uuid"
}
```

### Reorder Items

```typescript
PUT /api/tenants/[tenantId]/collections/[collectionId]/items/reorder

{
  "item_ids": ["item-1", "item-2", "item-3"]
}
```

## Row Level Security

- **Select**: Visible collections accessible to all authenticated users
- **Insert/Update/Delete**: Service role only

## Performance Considerations

1. **Denormalized arrays** (`featured_book_ids`, `featured_order_ids`) - Quick access without joins
2. **Indexes on visibility flags** - Fast filtering for homepage collections
3. **Display order index** - Fast sorting by position

## Related Features

- **MT-004**: Tenant-Specific Homepage - Uses featured collections
- **MT-006**: Tenant Template Overrides - Collections respect tenant styling
- **MT-010**: Tenant-Aware Email Sequences - Can reference featured collections

## Future Enhancements

- Collection templates (auto-generate from book sales trends)
- Time-based collections (seasonal, limited-time features)
- Collection analytics (views, clicks, conversions)
- Bulk operations (add multiple items at once)
