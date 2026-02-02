/**
 * Brand Kits Schema
 * Feature: PB-038
 *
 * Tables for storing brand kits (logos, colors, fonts)
 * Enables consistent branding across photo books
 */

-- ============================================================================
-- Brand Kits Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  description TEXT,

  -- Visual assets (stored as JSONB)
  logos JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of BrandLogo objects
  colors JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of BrandColor objects
  fonts JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of BrandFont objects

  -- Typography settings
  typography JSONB DEFAULT '{}'::jsonb,

  -- Layout preferences
  layout JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_brand_kits_user_id ON brand_kits(user_id);
CREATE INDEX idx_brand_kits_workspace_id ON brand_kits(workspace_id);
CREATE INDEX idx_brand_kits_is_default ON brand_kits(user_id, is_default) WHERE is_default = true;

-- ============================================================================
-- Brand Kit Applications Table
-- ============================================================================

/**
 * Tracks when and where brand kits are applied
 * Useful for analytics and usage tracking
 */
CREATE TABLE IF NOT EXISTS brand_kit_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,

  -- Target
  photo_book_project_id UUID, -- Reference to photo book project
  page_number INTEGER,

  -- Application settings
  settings JSONB NOT NULL DEFAULT '{}'::jsonb, -- BrandKitApplication settings

  -- Metadata
  applied_by UUID NOT NULL, -- User who applied the brand kit
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_brand_kit_applications_brand_kit ON brand_kit_applications(brand_kit_id);
CREATE INDEX idx_brand_kit_applications_project ON brand_kit_applications(photo_book_project_id);

-- ============================================================================
-- Functions
-- ============================================================================

/**
 * Update updated_at timestamp
 */
CREATE OR REPLACE FUNCTION update_brand_kit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_kits_updated_at
  BEFORE UPDATE ON brand_kits
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_kit_updated_at();

/**
 * Ensure only one default brand kit per user
 */
CREATE OR REPLACE FUNCTION ensure_single_default_brand_kit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset other defaults for this user
    UPDATE brand_kits
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_kits_single_default
  BEFORE INSERT OR UPDATE ON brand_kits
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_brand_kit();

-- ============================================================================
-- Sample Data (Optional)
-- ============================================================================

-- Uncomment to insert default brand kit templates
-- INSERT INTO brand_kits (user_id, name, description, colors, fonts, typography, is_public)
-- VALUES (
--   (SELECT id FROM users LIMIT 1), -- Replace with actual user ID
--   'Modern Minimal',
--   'Clean, minimalist design with black, white, and gray',
--   '[
--     {"name": "Black", "hex": "#000000", "role": "text"},
--     {"name": "White", "hex": "#FFFFFF", "role": "background"},
--     {"name": "Gray", "hex": "#6B7280", "role": "secondary"}
--   ]'::jsonb,
--   '[
--     {
--       "name": "Helvetica",
--       "family": "Helvetica, Arial, sans-serif",
--       "variants": ["400", "700"],
--       "category": "sans-serif",
--       "source": "system"
--     }
--   ]'::jsonb,
--   '{
--     "headingFont": "Helvetica",
--     "bodyFont": "Helvetica",
--     "defaultFontSize": 12,
--     "lineHeight": 1.5
--   }'::jsonb,
--   true
-- );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE brand_kits IS 'Brand kits containing logos, colors, and fonts for consistent branding';
COMMENT ON TABLE brand_kit_applications IS 'Tracking table for brand kit applications to photo book projects';
COMMENT ON COLUMN brand_kits.logos IS 'Array of logo objects with id, name, url, dimensions';
COMMENT ON COLUMN brand_kits.colors IS 'Array of color objects with name, hex, role';
COMMENT ON COLUMN brand_kits.fonts IS 'Array of font objects with name, family, variants, source';
COMMENT ON COLUMN brand_kits.is_default IS 'Whether this is the default brand kit for the user';
COMMENT ON COLUMN brand_kits.is_public IS 'Whether this brand kit is shared with workspace members';
