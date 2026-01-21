-- VelloPad Assets Schema
-- DB-002: Database Schema - Assets
-- Created: 2026-01-21
-- Dependencies: DB-001 (initial schema)

-- ============================================================================
-- ASSETS
-- ============================================================================

-- Asset types
CREATE TYPE asset_type AS ENUM (
  'image',
  'font',
  'template',
  'other'
);

-- Assets table - stores images, fonts, and other files
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE, -- NULL if workspace-level asset
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File metadata
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  asset_type asset_type NOT NULL DEFAULT 'image',
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- in bytes
  storage_path TEXT NOT NULL, -- path in storage bucket
  storage_url TEXT, -- public URL if applicable

  -- Image-specific metadata (NULL for non-images)
  width INTEGER,
  height INTEGER,
  dpi DECIMAL(10, 2), -- dots per inch (for print quality warnings)
  color_space TEXT, -- RGB, CMYK, etc.

  -- Print quality
  is_print_safe BOOLEAN DEFAULT false, -- true if DPI >= 300 at target size
  print_quality_warnings JSONB DEFAULT '[]'::jsonb, -- array of warning messages

  -- Usage tracking
  usage_count INTEGER DEFAULT 0, -- how many times used in books
  last_used_at TIMESTAMPTZ,

  -- Tags and organization
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_assets_workspace_id ON assets(workspace_id);
CREATE INDEX idx_assets_book_id ON assets(book_id) WHERE book_id IS NOT NULL;
CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_asset_type ON assets(asset_type);
CREATE INDEX idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX idx_assets_created_at ON assets(created_at DESC);

-- ============================================================================
-- TEMPLATES
-- ============================================================================

-- Template categories
CREATE TYPE template_category AS ENUM (
  'interior',
  'cover',
  'both'
);

-- Templates table - interior and cover design templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- NULL for global templates

  -- Template metadata
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  category template_category NOT NULL,

  -- Template configuration (JSON with template-specific settings)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example config for interior template:
  -- {
  --   "margins": {"top": 1, "bottom": 1, "inner": 0.75, "outer": 0.5},
  --   "fontSize": {"body": 11, "heading1": 18, "heading2": 14},
  --   "fontFamily": {"body": "Garamond", "heading": "Georgia"},
  --   "lineHeight": 1.5,
  --   "textAlign": "justify",
  --   "pageNumbering": {"enabled": true, "position": "bottom-center", "startPage": 1}
  -- }

  -- Visual preview
  preview_image_url TEXT,
  thumbnail_url TEXT,

  -- Availability
  is_global BOOLEAN DEFAULT false, -- true if available to all workspaces
  is_featured BOOLEAN DEFAULT false, -- true if featured in template gallery

  -- Usage
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique slugs per workspace (or globally)
  UNIQUE(workspace_id, slug)
);

-- Indexes for templates
CREATE INDEX idx_templates_workspace_id ON templates(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_is_global ON templates(is_global) WHERE is_global = true;
CREATE INDEX idx_templates_is_featured ON templates(is_featured) WHERE is_featured = true;
CREATE INDEX idx_templates_slug ON templates(slug);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Assets: Users can only access assets in their workspaces
CREATE POLICY "Users can view assets in their workspaces"
  ON assets FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert assets to their workspaces"
  ON assets FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own assets"
  ON assets FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own assets"
  ON assets FOR DELETE
  USING (user_id = auth.uid());

-- Templates: Users can view global templates or workspace templates
CREATE POLICY "Users can view global templates or workspace templates"
  ON templates FOR SELECT
  USING (
    is_global = true
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert workspace templates"
  ON templates FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can update workspace templates"
  ON templates FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Workspace admins can delete workspace templates"
  ON templates FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps on asset update
CREATE OR REPLACE FUNCTION update_asset_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assets_timestamp
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_timestamp();

-- Update timestamps on template update
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_templates_timestamp
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_timestamp();

-- ============================================================================
-- DEFAULT GLOBAL TEMPLATES
-- ============================================================================

-- Insert default interior templates
INSERT INTO templates (name, slug, description, category, config, is_global, is_featured) VALUES
(
  'Classic Novel',
  'classic-novel',
  'Traditional novel formatting with justified text and elegant typography',
  'interior',
  '{
    "margins": {"top": 1, "bottom": 1, "inner": 0.875, "outer": 0.625},
    "fontSize": {"body": 11, "heading1": 18, "heading2": 14, "heading3": 12},
    "fontFamily": {"body": "Garamond", "heading": "Garamond"},
    "lineHeight": 1.5,
    "textAlign": "justify",
    "pageNumbering": {"enabled": true, "position": "bottom-center", "startPage": 1},
    "chapterStart": "new-page",
    "dropCap": false
  }'::jsonb,
  true,
  true
),
(
  'Modern Minimal',
  'modern-minimal',
  'Clean, minimalist design with generous white space',
  'interior',
  '{
    "margins": {"top": 1.25, "bottom": 1.25, "inner": 1, "outer": 0.75},
    "fontSize": {"body": 11, "heading1": 24, "heading2": 16, "heading3": 13},
    "fontFamily": {"body": "Georgia", "heading": "Helvetica"},
    "lineHeight": 1.6,
    "textAlign": "left",
    "pageNumbering": {"enabled": true, "position": "bottom-outer", "startPage": 1},
    "chapterStart": "new-page",
    "dropCap": false
  }'::jsonb,
  true,
  true
),
(
  'Business Professional',
  'business-professional',
  'Professional formatting for business books and reports',
  'interior',
  '{
    "margins": {"top": 1, "bottom": 1, "inner": 1, "outer": 0.75},
    "fontSize": {"body": 10.5, "heading1": 16, "heading2": 13, "heading3": 11},
    "fontFamily": {"body": "Times New Roman", "heading": "Arial"},
    "lineHeight": 1.4,
    "textAlign": "left",
    "pageNumbering": {"enabled": true, "position": "bottom-center", "startPage": 1},
    "chapterStart": "same-page",
    "dropCap": false
  }'::jsonb,
  true,
  true
);

-- Insert default cover templates
INSERT INTO templates (name, slug, description, category, config, is_global, is_featured) VALUES
(
  'Bold Title',
  'bold-title',
  'Large, bold title with subtitle and author name',
  'cover',
  '{
    "titleFontSize": 48,
    "titleFontFamily": "Helvetica Bold",
    "subtitleFontSize": 24,
    "subtitleFontFamily": "Georgia",
    "authorFontSize": 18,
    "authorFontFamily": "Georgia",
    "layout": "centered",
    "titleColor": "#000000",
    "backgroundColor": "#FFFFFF"
  }'::jsonb,
  true,
  true
),
(
  'Classic Elegant',
  'classic-elegant',
  'Elegant serif typography with centered layout',
  'cover',
  '{
    "titleFontSize": 42,
    "titleFontFamily": "Garamond",
    "subtitleFontSize": 20,
    "subtitleFontFamily": "Garamond Italic",
    "authorFontSize": 16,
    "authorFontFamily": "Garamond",
    "layout": "centered",
    "titleColor": "#1a1a1a",
    "backgroundColor": "#f5f5f5"
  }'::jsonb,
  true,
  true
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE assets IS 'Stores uploaded assets (images, fonts, etc) with metadata and print quality info';
COMMENT ON TABLE templates IS 'Interior and cover design templates with configuration';
COMMENT ON COLUMN assets.dpi IS 'Dots per inch - critical for print quality (300+ DPI recommended)';
COMMENT ON COLUMN assets.is_print_safe IS 'True if image meets minimum print quality standards (300 DPI)';
COMMENT ON COLUMN assets.print_quality_warnings IS 'Array of warning messages about print quality issues';
COMMENT ON COLUMN templates.config IS 'JSONB configuration object with template-specific settings';
