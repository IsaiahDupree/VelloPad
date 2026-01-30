-- ================================================
-- MT-005: Tenant Collections
-- Migration: Create tenant_collections table
-- ================================================
-- Feature: MT-005 - Tenant Collections
-- Stores curated product collections per tenant
--
-- Enables:
-- - Tenant-specific featured collections
-- - Custom curation per niche
-- - Community showcase collections

-- ================================================
-- Table: tenant_collections
-- ================================================

CREATE TABLE IF NOT EXISTS tenant_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  category text,

  -- Collection content
  featured_book_ids uuid[] DEFAULT ARRAY[]::uuid[],
  featured_order_ids uuid[] DEFAULT ARRAY[]::uuid[],
  cover_image_url text,

  -- Display settings
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  show_in_home boolean NOT NULL DEFAULT false,
  show_in_sidebar boolean NOT NULL DEFAULT false,

  -- Metadata
  metadata jsonb DEFAULT NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id, slug),
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]{3,64}$')
);

-- ================================================
-- Table: tenant_collection_items
-- ================================================
-- Individual items (books/orders) in collections

CREATE TABLE IF NOT EXISTS tenant_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES tenant_collections(id) ON DELETE CASCADE,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  position integer NOT NULL,

  created_at timestamptz DEFAULT now(),

  CHECK (
    (book_id IS NOT NULL AND order_id IS NULL) OR
    (book_id IS NULL AND order_id IS NOT NULL)
  ),
  UNIQUE(collection_id, position)
);

-- ================================================
-- Indexes for Performance
-- ================================================

CREATE INDEX IF NOT EXISTS idx_tenant_collections_tenant_id
ON tenant_collections(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_collections_visible
ON tenant_collections(tenant_id, is_visible)
WHERE is_visible = true;

CREATE INDEX IF NOT EXISTS idx_tenant_collections_home
ON tenant_collections(tenant_id, show_in_home)
WHERE show_in_home = true;

CREATE INDEX IF NOT EXISTS idx_tenant_collections_sidebar
ON tenant_collections(tenant_id, show_in_sidebar)
WHERE show_in_sidebar = true;

CREATE INDEX IF NOT EXISTS idx_tenant_collection_items_collection_id
ON tenant_collection_items(collection_id);

CREATE INDEX IF NOT EXISTS idx_tenant_collection_items_book_id
ON tenant_collection_items(book_id);

CREATE INDEX IF NOT EXISTS idx_tenant_collection_items_order_id
ON tenant_collection_items(order_id);

-- ================================================
-- Updated At Trigger
-- ================================================

CREATE OR REPLACE FUNCTION update_tenant_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_collections_updated_at
  BEFORE UPDATE ON tenant_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_collections_updated_at();

-- ================================================
-- Helper Functions
-- ================================================

-- Get all collections for a tenant
CREATE OR REPLACE FUNCTION get_tenant_collections(
  tenant_id_param uuid,
  visible_only boolean DEFAULT true
)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  description text,
  category text,
  cover_image_url text,
  display_order integer,
  item_count integer,
  is_visible boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.name,
    tc.slug,
    tc.description,
    tc.category,
    tc.cover_image_url,
    tc.display_order,
    COUNT(tci.id)::integer,
    tc.is_visible
  FROM tenant_collections tc
  LEFT JOIN tenant_collection_items tci ON tci.collection_id = tc.id
  WHERE tc.tenant_id = tenant_id_param
  AND (NOT visible_only OR tc.is_visible = true)
  GROUP BY tc.id, tc.name, tc.slug, tc.description, tc.category,
           tc.cover_image_url, tc.display_order, tc.is_visible
  ORDER BY tc.display_order ASC, tc.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get featured collections for homepage
CREATE OR REPLACE FUNCTION get_featured_collections(tenant_id_param uuid)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  description text,
  cover_image_url text,
  item_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.name,
    tc.slug,
    tc.description,
    tc.cover_image_url,
    COUNT(tci.id)::integer
  FROM tenant_collections tc
  LEFT JOIN tenant_collection_items tci ON tci.collection_id = tc.id
  WHERE tc.tenant_id = tenant_id_param
  AND tc.is_visible = true
  AND tc.show_in_home = true
  GROUP BY tc.id, tc.name, tc.slug, tc.description, tc.cover_image_url
  ORDER BY tc.display_order ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get items in a collection
CREATE OR REPLACE FUNCTION get_collection_items(collection_id_param uuid)
RETURNS TABLE(
  position integer,
  book_id uuid,
  book_title text,
  book_cover_url text,
  order_id uuid,
  order_user_email text,
  order_total numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tci.position,
    b.id,
    b.title,
    b.cover_url,
    o.id,
    p.email,
    o.total_price
  FROM tenant_collection_items tci
  LEFT JOIN books b ON tci.book_id = b.id
  LEFT JOIN orders o ON tci.order_id = o.id
  LEFT JOIN profiles p ON o.user_id = p.id
  WHERE tci.collection_id = collection_id_param
  ORDER BY tci.position ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add item to collection
CREATE OR REPLACE FUNCTION add_collection_item(
  collection_id_param uuid,
  book_id_param uuid DEFAULT NULL,
  order_id_param uuid DEFAULT NULL
)
RETURNS tenant_collection_items AS $$
DECLARE
  max_position integer;
  result tenant_collection_items;
BEGIN
  -- Get next position
  SELECT COALESCE(MAX(position), 0) + 1 INTO max_position
  FROM tenant_collection_items
  WHERE collection_id = collection_id_param;

  -- Insert item
  INSERT INTO tenant_collection_items (
    collection_id,
    book_id,
    order_id,
    position
  )
  VALUES (collection_id_param, book_id_param, order_id_param, max_position)
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Remove item from collection
CREATE OR REPLACE FUNCTION remove_collection_item(item_id_param uuid)
RETURNS boolean AS $$
BEGIN
  DELETE FROM tenant_collection_items WHERE id = item_id_param;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Reorder collection items
CREATE OR REPLACE FUNCTION reorder_collection_items(
  collection_id_param uuid,
  new_positions jsonb
)
RETURNS boolean AS $$
BEGIN
  -- Update positions based on provided mapping: {item_id: position, ...}
  UPDATE tenant_collection_items tci
  SET position = (new_positions->>(tci.id::text))::integer
  WHERE collection_id = collection_id_param;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE tenant_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_collection_items ENABLE ROW LEVEL SECURITY;

-- Public read access for visible collections
CREATE POLICY "Tenant collections are viewable by everyone"
  ON tenant_collections
  FOR SELECT
  USING (is_visible = true);

-- Service role can manage all collections
CREATE POLICY "Tenant collections are manageable by service role"
  ON tenant_collections
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Public read access to collection items
CREATE POLICY "Tenant collection items are viewable by everyone"
  ON tenant_collection_items
  FOR SELECT
  USING (EXISTS(
    SELECT 1 FROM tenant_collections tc
    WHERE tc.id = tenant_collection_items.collection_id
    AND tc.is_visible = true
  ));

-- Service role can manage all collection items
CREATE POLICY "Tenant collection items are manageable by service role"
  ON tenant_collection_items
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ================================================
-- Comments for Documentation
-- ================================================

COMMENT ON TABLE tenant_collections IS 'Curated collections of books and orders per tenant';
COMMENT ON TABLE tenant_collection_items IS 'Individual books/orders that belong to collections';
COMMENT ON COLUMN tenant_collections.slug IS 'URL-safe slug for collection';
COMMENT ON COLUMN tenant_collections.featured_book_ids IS 'Denormalized array of featured book IDs for quick access';
COMMENT ON COLUMN tenant_collections.featured_order_ids IS 'Denormalized array of featured order IDs for quick access';
COMMENT ON COLUMN tenant_collections.show_in_home IS 'Whether to display in tenant homepage';
COMMENT ON COLUMN tenant_collections.show_in_sidebar IS 'Whether to display in sidebar navigation';

-- ================================================
-- Permissions
-- ================================================

GRANT SELECT ON tenant_collections TO authenticated;
GRANT SELECT ON tenant_collections TO anon;
GRANT SELECT ON tenant_collection_items TO authenticated;
GRANT SELECT ON tenant_collection_items TO anon;

GRANT ALL ON tenant_collections TO service_role;
GRANT ALL ON tenant_collection_items TO service_role;

GRANT EXECUTE ON FUNCTION get_tenant_collections TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_collections TO anon;
GRANT EXECUTE ON FUNCTION get_featured_collections TO authenticated;
GRANT EXECUTE ON FUNCTION get_featured_collections TO anon;
GRANT EXECUTE ON FUNCTION get_collection_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_items TO anon;

GRANT EXECUTE ON FUNCTION add_collection_item TO service_role;
GRANT EXECUTE ON FUNCTION remove_collection_item TO service_role;
GRANT EXECUTE ON FUNCTION reorder_collection_items TO service_role;

-- ================================================
-- Migration Complete
-- ================================================

DO $$
BEGIN
  RAISE NOTICE 'MT-005 migration completed successfully';
  RAISE NOTICE 'Created: tenant_collections table';
  RAISE NOTICE 'Created: tenant_collection_items table';
  RAISE NOTICE 'Created: 6 indexes';
  RAISE NOTICE 'Created: 6 helper functions';
  RAISE NOTICE 'Enabled: RLS for both tables';
END $$;
