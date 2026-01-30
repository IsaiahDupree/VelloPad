-- ================================================
-- MT-006: Tenant Template Overrides
-- Migration: Create tenant_template_overrides table
-- ================================================
-- Feature: MT-006 - Tenant Template Overrides
-- Allows tenants to override global templates with custom versions
--
-- Features:
-- - Store per-tenant template overrides
-- - Version history for rollback capability
-- - Active/inactive tracking

-- ================================================
-- Table: tenant_template_overrides
-- ================================================
-- Stores tenant-specific overrides to global templates

CREATE TABLE IF NOT EXISTS tenant_template_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

  -- Configuration overrides (merged with base template)
  config_overrides jsonb NOT NULL DEFAULT '{}',

  -- Version tracking for rollback
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_tenant_template_version UNIQUE (tenant_id, template_id, version)
);

-- ================================================
-- Indexes for Performance
-- ================================================

-- Index for finding active overrides
CREATE INDEX IF NOT EXISTS idx_tenant_template_overrides_active
ON tenant_template_overrides(tenant_id, template_id, is_active)
WHERE is_active = true;

-- Index for template_id lookups
CREATE INDEX IF NOT EXISTS idx_tenant_template_overrides_template_id
ON tenant_template_overrides(template_id);

-- Index for version history
CREATE INDEX IF NOT EXISTS idx_tenant_template_overrides_version
ON tenant_template_overrides(tenant_id, template_id, version DESC);

-- Index for created_at (for pagination)
CREATE INDEX IF NOT EXISTS idx_tenant_template_overrides_created_at
ON tenant_template_overrides(tenant_id, created_at DESC);

-- ================================================
-- Updated At Trigger
-- ================================================

CREATE OR REPLACE FUNCTION update_tenant_template_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_template_overrides_updated_at
  BEFORE UPDATE ON tenant_template_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_template_overrides_updated_at();

-- ================================================
-- Helper Functions
-- ================================================

-- Get active override for a tenant/template pair
CREATE OR REPLACE FUNCTION get_tenant_template_override(
  tenant_id_param uuid,
  template_id_param uuid
)
RETURNS tenant_template_overrides AS $$
BEGIN
  RETURN (
    SELECT * FROM tenant_template_overrides
    WHERE tenant_id = tenant_id_param
    AND template_id = template_id_param
    AND is_active = true
    ORDER BY version DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Get all overrides for a tenant
CREATE OR REPLACE FUNCTION get_tenant_overrides(tenant_id_param uuid)
RETURNS TABLE(
  id uuid,
  template_id uuid,
  version integer,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (tto.template_id)
    tto.id,
    tto.template_id,
    tto.version,
    tto.created_at,
    tto.updated_at
  FROM tenant_template_overrides tto
  WHERE tto.tenant_id = tenant_id_param
  AND tto.is_active = true
  ORDER BY tto.template_id, tto.version DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get version history for a template override
CREATE OR REPLACE FUNCTION get_override_history(
  tenant_id_param uuid,
  template_id_param uuid
)
RETURNS TABLE(
  version integer,
  created_at timestamptz,
  is_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tto.version,
    tto.created_at,
    tto.is_active
  FROM tenant_template_overrides tto
  WHERE tto.tenant_id = tenant_id_param
  AND tto.template_id = template_id_param
  ORDER BY tto.version DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Deactivate old versions when creating new one
CREATE OR REPLACE FUNCTION deactivate_old_overrides(
  tenant_id_param uuid,
  template_id_param uuid
)
RETURNS boolean AS $$
BEGIN
  UPDATE tenant_template_overrides
  SET is_active = false
  WHERE tenant_id = tenant_id_param
  AND template_id = template_id_param
  AND is_active = true;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE tenant_template_overrides ENABLE ROW LEVEL SECURITY;

-- Service role can manage all overrides
CREATE POLICY "Override management via service role"
  ON tenant_template_overrides
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ================================================
-- Comments for Documentation
-- ================================================

COMMENT ON TABLE tenant_template_overrides IS 'Per-tenant overrides to global template configurations';
COMMENT ON COLUMN tenant_template_overrides.config_overrides IS 'JSONB object with config values to override in the base template';
COMMENT ON COLUMN tenant_template_overrides.version IS 'Version number for rollback capability';
COMMENT ON COLUMN tenant_template_overrides.is_active IS 'Whether this is the currently active override version';

-- ================================================
-- Permissions
-- ================================================

GRANT SELECT ON tenant_template_overrides TO authenticated;
GRANT ALL ON tenant_template_overrides TO service_role;

GRANT EXECUTE ON FUNCTION get_tenant_template_override TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_template_override TO service_role;
GRANT EXECUTE ON FUNCTION get_tenant_overrides TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_overrides TO service_role;
GRANT EXECUTE ON FUNCTION get_override_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_override_history TO service_role;
GRANT EXECUTE ON FUNCTION deactivate_old_overrides TO service_role;

-- ================================================
-- Migration Complete
-- ================================================

DO $$
BEGIN
  RAISE NOTICE 'MT-006 migration completed successfully';
  RAISE NOTICE 'Created: tenant_template_overrides table';
  RAISE NOTICE 'Created: 4 indexes';
  RAISE NOTICE 'Created: 4 helper functions';
  RAISE NOTICE 'Enabled: RLS for template overrides';
END $$;
