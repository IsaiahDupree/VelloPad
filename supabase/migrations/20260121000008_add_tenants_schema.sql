-- ================================================
-- VelloPad Multi-Tenant Architecture
-- Migration: Add Tenants Schema
-- ================================================
-- This migration creates the tenants table and related functions
-- for the multi-tenant storefront architecture.
--
-- Features:
-- - Tenant management (subdomains + custom domains)
-- - Brand kit configuration (JSONB)
-- - Email branding integration
-- - Row Level Security policies
-- ================================================

-- ================================================
-- Table: tenants
-- ================================================
-- Stores tenant (storefront) information
-- Each tenant can have:
-- - A subdomain (slug.vellopad.com)
-- - Multiple custom domains
-- - Custom branding (colors, fonts, logo)
-- - Custom email branding

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  domains text[] DEFAULT ARRAY[]::text[],
  brand_kit jsonb DEFAULT NULL,
  email_branding_id text DEFAULT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]{3,32}$'),
  CONSTRAINT unique_slug UNIQUE (slug)
);

-- ================================================
-- Indexes for Performance
-- ================================================

-- Index for slug lookups (subdomain resolution)
CREATE INDEX idx_tenants_slug ON tenants(slug) WHERE enabled = true;

-- GIN index for domain array lookups (custom domain resolution)
CREATE INDEX idx_tenants_domains ON tenants USING GIN(domains);

-- Index for enabled tenants
CREATE INDEX idx_tenants_enabled ON tenants(enabled);

-- Index for created_at (for pagination)
CREATE INDEX idx_tenants_created_at ON tenants(created_at DESC);

-- ================================================
-- Updated At Trigger
-- ================================================

CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_tenants_updated_at();

-- ================================================
-- Row Level Security (RLS)
-- ================================================
-- Tenants are managed by admins, but visible to all authenticated users

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Public read access for enabled tenants (needed for hostname resolution)
CREATE POLICY "Tenants are viewable by everyone"
  ON tenants
  FOR SELECT
  USING (enabled = true);

-- Only service role can insert/update/delete tenants
-- (In production, you'd have an admin role check here)
CREATE POLICY "Tenants are manageable by service role"
  ON tenants
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ================================================
-- Helper Functions
-- ================================================

-- Function: Get tenant by slug
CREATE OR REPLACE FUNCTION get_tenant_by_slug(tenant_slug text)
RETURNS tenants AS $$
BEGIN
  RETURN (
    SELECT * FROM tenants
    WHERE slug = tenant_slug
    AND enabled = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get tenant by custom domain
CREATE OR REPLACE FUNCTION get_tenant_by_domain(domain text)
RETURNS tenants AS $$
BEGIN
  RETURN (
    SELECT * FROM tenants
    WHERE domain = ANY(domains)
    AND enabled = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Check if slug is available
CREATE OR REPLACE FUNCTION is_slug_available(check_slug text)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM tenants
    WHERE slug = check_slug
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get tenant statistics
CREATE OR REPLACE FUNCTION get_tenant_stats(tenant_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_workspaces', (
      SELECT COUNT(*)
      FROM workspaces w
      WHERE w.id IN (
        -- Count workspaces where users signed up via this tenant
        SELECT DISTINCT workspace_id
        FROM workspace_members wm
        JOIN profiles p ON p.id = wm.user_id
        WHERE p.metadata->>'signup_tenant_id' = tenant_id::text
      )
    ),
    'total_books', (
      SELECT COUNT(*)
      FROM books b
      WHERE b.workspace_id IN (
        SELECT DISTINCT workspace_id
        FROM workspace_members wm
        JOIN profiles p ON p.id = wm.user_id
        WHERE p.metadata->>'signup_tenant_id' = tenant_id::text
      )
    ),
    'total_orders', (
      SELECT COUNT(*)
      FROM orders o
      WHERE o.workspace_id IN (
        SELECT DISTINCT workspace_id
        FROM workspace_members wm
        JOIN profiles p ON p.id = wm.user_id
        WHERE p.metadata->>'signup_tenant_id' = tenant_id::text
      )
    ),
    'total_revenue', COALESCE((
      SELECT SUM(total_price)
      FROM orders o
      WHERE o.status IN ('paid', 'processing', 'printing', 'shipped', 'delivered')
      AND o.workspace_id IN (
        SELECT DISTINCT workspace_id
        FROM workspace_members wm
        JOIN profiles p ON p.id = wm.user_id
        WHERE p.metadata->>'signup_tenant_id' = tenant_id::text
      )
    ), 0)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ================================================
-- Seed Default Tenant
-- ================================================
-- Insert default tenant for main domain (vellopad.com)

INSERT INTO tenants (
  name,
  slug,
  domains,
  brand_kit,
  enabled
) VALUES (
  'VelloPad',
  'default',
  ARRAY['vellopad.com', 'www.vellopad.com'],
  jsonb_build_object(
    'primary_color', '#6366f1',
    'secondary_color', '#8b5cf6',
    'accent_color', '#ec4899',
    'background_color', '#ffffff',
    'text_color', '#1f2937',
    'heading_font', 'Inter',
    'body_font', 'Inter',
    'hero_variant', 'centered',
    'homepage_sections', ARRAY['hero', 'features', 'testimonials', 'cta'],
    'tone', 'professional'
  ),
  true
)
ON CONFLICT (slug) DO NOTHING;

-- ================================================
-- Comments for Documentation
-- ================================================

COMMENT ON TABLE tenants IS 'Multi-tenant storefronts with subdomain and custom domain support';
COMMENT ON COLUMN tenants.slug IS 'URL-safe slug for subdomain (e.g., faith → faith.vellopad.com)';
COMMENT ON COLUMN tenants.domains IS 'Array of custom domains pointing to this tenant';
COMMENT ON COLUMN tenants.brand_kit IS 'JSONB object with branding configuration (colors, fonts, logo, etc.)';
COMMENT ON COLUMN tenants.email_branding_id IS 'Reference to email branding configuration (from email provider)';
COMMENT ON COLUMN tenants.enabled IS 'Whether this tenant is active and accessible';

-- ================================================
-- Grant Permissions
-- ================================================

-- Grant access to authenticated users (read only via RLS)
GRANT SELECT ON tenants TO authenticated;
GRANT SELECT ON tenants TO anon;

-- Service role has full access
GRANT ALL ON tenants TO service_role;

-- ================================================
-- Migration Complete
-- ================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Tenants schema migration completed successfully';
  RAISE NOTICE 'Created: tenants table';
  RAISE NOTICE 'Created: 4 indexes';
  RAISE NOTICE 'Created: 2 RLS policies';
  RAISE NOTICE 'Created: 4 helper functions';
  RAISE NOTICE 'Seeded: 1 default tenant (VelloPad)';
END $$;
