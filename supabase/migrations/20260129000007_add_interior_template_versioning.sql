-- PM-006: Interior Template Versioning
-- Tables for tracking interior template versions and snapshots

-- Interior Template Versions Table
CREATE TABLE IF NOT EXISTS interior_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  version INT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('photo-book', 'custom-interior', 'notebook')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  release_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, version)
);

CREATE INDEX idx_interior_template_versions_template_id ON interior_template_versions(template_id);
CREATE INDEX idx_interior_template_versions_active ON interior_template_versions(template_id, is_active);
CREATE INDEX idx_interior_template_versions_category ON interior_template_versions(category);

-- Template Version Snapshots Table
-- Stores which template version was used for a specific rendition
CREATE TABLE IF NOT EXISTS template_version_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rendition_id UUID NOT NULL REFERENCES renditions(id) ON DELETE CASCADE,
  template_id UUID NOT NULL,
  template_version INT NOT NULL,
  template_version_id UUID NOT NULL REFERENCES interior_template_versions(id) ON DELETE RESTRICT,
  template_category TEXT NOT NULL,
  template_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rendition_id)
);

CREATE INDEX idx_template_version_snapshots_rendition ON template_version_snapshots(rendition_id);
CREATE INDEX idx_template_version_snapshots_template ON template_version_snapshots(template_id);
