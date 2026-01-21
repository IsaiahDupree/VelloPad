-- Migration: Add Tenant Row Level Security
-- Description: Add tenant_id to core tables and implement RLS policies for tenant isolation
-- Created: 2026-01-21

-- =====================================================
-- STEP 1: Add tenant_id column to core tables
-- =====================================================

-- Add tenant_id to workspaces
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to books
ALTER TABLE books
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to assets
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to renditions
ALTER TABLE renditions
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 2: Set default tenant for existing records
-- =====================================================

-- Get default tenant ID
DO $$
DECLARE
  default_tenant_id uuid;
BEGIN
  -- Get the default tenant ID
  SELECT id INTO default_tenant_id
  FROM tenants
  WHERE slug = 'default'
  LIMIT 1;

  -- If default tenant exists, update all records
  IF default_tenant_id IS NOT NULL THEN
    UPDATE workspaces SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE books SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE assets SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE renditions SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE orders SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE events SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  END IF;
END $$;

-- =====================================================
-- STEP 3: Make tenant_id required for most tables
-- =====================================================

-- Make tenant_id NOT NULL (except events which can be global)
ALTER TABLE workspaces ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE books ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE assets ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE renditions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL;
-- events.tenant_id can be NULL for system-wide events

-- =====================================================
-- STEP 4: Create indexes for tenant queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_id ON workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_books_tenant_id ON books(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_tenant_id ON assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_renditions_tenant_id ON renditions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id) WHERE tenant_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_created ON workspaces(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_tenant_workspace ON books(tenant_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);

-- =====================================================
-- STEP 5: Update RLS policies for tenant isolation
-- =====================================================

-- Drop existing RLS policies that don't account for tenants
-- We'll recreate them with tenant awareness

-- Workspaces RLS
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON workspaces;
DROP POLICY IF EXISTS "Users can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;

-- Create tenant-aware workspace policies
CREATE POLICY "Users can view workspaces in their tenant"
  ON workspaces FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members WHERE workspace_id = id
    )
  );

CREATE POLICY "Users can update workspaces in their tenant"
  ON workspaces FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members
      WHERE workspace_id = id
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Books RLS (tenant-aware)
DROP POLICY IF EXISTS "Users can view books in their workspaces" ON books;
DROP POLICY IF EXISTS "Users can update books in their workspaces" ON books;
DROP POLICY IF EXISTS "Users can create books in their workspaces" ON books;
DROP POLICY IF EXISTS "Users can delete books in their workspaces" ON books;

CREATE POLICY "Users can view books in their tenant"
  ON books FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update books in their tenant"
  ON books FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create books in their tenant"
  ON books FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete books in their tenant"
  ON books FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Assets RLS (tenant-aware)
DROP POLICY IF EXISTS "Users can view assets in their workspaces" ON assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON assets;
DROP POLICY IF EXISTS "Users can insert assets in their workspaces" ON assets;

CREATE POLICY "Users can view assets in their tenant"
  ON assets FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own assets"
  ON assets FOR UPDATE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own assets"
  ON assets FOR DELETE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can insert assets in their tenant"
  ON assets FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Renditions RLS (tenant-aware)
DROP POLICY IF EXISTS "Users can view renditions for their books" ON renditions;
DROP POLICY IF EXISTS "Users can create renditions for their books" ON renditions;

CREATE POLICY "Users can view renditions in their tenant"
  ON renditions FOR SELECT
  USING (
    book_id IN (
      SELECT b.id FROM books b
      INNER JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create renditions in their tenant"
  ON renditions FOR INSERT
  WITH CHECK (
    book_id IN (
      SELECT b.id FROM books b
      INNER JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Orders RLS (tenant-aware)
DROP POLICY IF EXISTS "Users can view their workspace orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;

CREATE POLICY "Users can view orders in their tenant"
  ON orders FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create orders in their tenant"
  ON orders FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Events RLS (tenant-aware, but allows global events)
DROP POLICY IF EXISTS "Users can view workspace events" ON events;
DROP POLICY IF EXISTS "Users can insert events" ON events;

CREATE POLICY "Users can view events in their tenant"
  ON events FOR SELECT
  USING (
    workspace_id IS NULL OR -- Global events
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events in their tenant"
  ON events FOR INSERT
  WITH CHECK (
    workspace_id IS NULL OR -- Global events
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 6: Create helper functions for tenant operations
-- =====================================================

-- Function to get user's tenant from their workspace
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_uuid uuid;
BEGIN
  -- Get tenant ID from user's first workspace
  SELECT w.tenant_id INTO tenant_uuid
  FROM workspaces w
  INNER JOIN workspace_members wm ON wm.workspace_id = w.id
  WHERE wm.user_id = auth.uid()
  LIMIT 1;

  RETURN tenant_uuid;
END;
$$;

-- Function to check if user has access to tenant
CREATE OR REPLACE FUNCTION user_has_tenant_access(check_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspaces w
    INNER JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = auth.uid()
    AND w.tenant_id = check_tenant_id
  );
END;
$$;

-- Function to get tenant statistics
CREATE OR REPLACE FUNCTION get_tenant_stats(tenant_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'workspaces', COUNT(DISTINCT w.id),
    'users', COUNT(DISTINCT wm.user_id),
    'books', COUNT(DISTINCT b.id),
    'orders', COUNT(DISTINCT o.id),
    'revenue', COALESCE(SUM(o.total_amount), 0)
  ) INTO stats
  FROM workspaces w
  LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
  LEFT JOIN books b ON b.workspace_id = w.id
  LEFT JOIN orders o ON o.workspace_id = w.id AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
  WHERE w.tenant_id = tenant_uuid;

  RETURN stats;
END;
$$;

-- =====================================================
-- STEP 7: Update triggers to set tenant_id automatically
-- =====================================================

-- Trigger to auto-set tenant_id on workspace creation
CREATE OR REPLACE FUNCTION set_workspace_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  default_tenant_id uuid;
BEGIN
  -- If tenant_id is not provided, use default tenant
  IF NEW.tenant_id IS NULL THEN
    SELECT id INTO default_tenant_id
    FROM tenants
    WHERE slug = 'default'
    LIMIT 1;

    NEW.tenant_id := default_tenant_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER workspace_set_tenant_id
  BEFORE INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION set_workspace_tenant_id();

-- Trigger to auto-set tenant_id on book creation
CREATE OR REPLACE FUNCTION set_book_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get tenant_id from workspace
  SELECT tenant_id INTO NEW.tenant_id
  FROM workspaces
  WHERE id = NEW.workspace_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER book_set_tenant_id
  BEFORE INSERT ON books
  FOR EACH ROW
  EXECUTE FUNCTION set_book_tenant_id();

-- Trigger to auto-set tenant_id on asset creation
CREATE OR REPLACE FUNCTION set_asset_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get tenant_id from workspace
  SELECT tenant_id INTO NEW.tenant_id
  FROM workspaces
  WHERE id = NEW.workspace_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_set_tenant_id
  BEFORE INSERT ON assets
  FOR EACH ROW
  EXECUTE FUNCTION set_asset_tenant_id();

-- Trigger to auto-set tenant_id on rendition creation
CREATE OR REPLACE FUNCTION set_rendition_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get tenant_id from book
  SELECT tenant_id INTO NEW.tenant_id
  FROM books
  WHERE id = NEW.book_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER rendition_set_tenant_id
  BEFORE INSERT ON renditions
  FOR EACH ROW
  EXECUTE FUNCTION set_rendition_tenant_id();

-- Trigger to auto-set tenant_id on order creation
CREATE OR REPLACE FUNCTION set_order_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get tenant_id from workspace
  SELECT tenant_id INTO NEW.tenant_id
  FROM workspaces
  WHERE id = NEW.workspace_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER order_set_tenant_id
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_tenant_id();

-- =====================================================
-- STEP 8: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN workspaces.tenant_id IS 'Reference to the tenant that owns this workspace';
COMMENT ON COLUMN books.tenant_id IS 'Reference to the tenant (inherited from workspace)';
COMMENT ON COLUMN assets.tenant_id IS 'Reference to the tenant (inherited from workspace)';
COMMENT ON COLUMN renditions.tenant_id IS 'Reference to the tenant (inherited from book)';
COMMENT ON COLUMN orders.tenant_id IS 'Reference to the tenant (inherited from workspace)';
COMMENT ON COLUMN events.tenant_id IS 'Reference to the tenant (NULL for global events)';

COMMENT ON FUNCTION get_user_tenant_id() IS 'Get the tenant ID for the current authenticated user';
COMMENT ON FUNCTION user_has_tenant_access(uuid) IS 'Check if current user has access to a specific tenant';
COMMENT ON FUNCTION get_tenant_stats(uuid) IS 'Get comprehensive statistics for a tenant';
