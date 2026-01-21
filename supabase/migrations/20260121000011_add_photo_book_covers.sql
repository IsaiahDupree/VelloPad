-- Photo Book Covers Table
-- Stores cover designs for photo book projects
-- Feature: PB-009 - Cover Design Editor

CREATE TABLE IF NOT EXISTS photo_book_covers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES photo_book_projects(id) ON DELETE CASCADE UNIQUE,

  -- Content
  title VARCHAR(100) NOT NULL,
  subtitle VARCHAR(150),
  author VARCHAR(100),
  cover_photo_id UUID REFERENCES photo_book_photos(id) ON DELETE SET NULL,

  -- Layout
  layout VARCHAR(50) NOT NULL DEFAULT 'full-bleed',
  text_position VARCHAR(20) NOT NULL DEFAULT 'center',

  -- Typography
  text_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  title_font_family VARCHAR(50) NOT NULL DEFAULT 'Georgia',
  title_font_size INTEGER NOT NULL DEFAULT 48,
  title_font_weight INTEGER NOT NULL DEFAULT 700,
  subtitle_font_family VARCHAR(50) NOT NULL DEFAULT 'Georgia',
  subtitle_font_size INTEGER NOT NULL DEFAULT 24,

  -- Overlay
  overlay_opacity INTEGER NOT NULL DEFAULT 40 CHECK (overlay_opacity >= 0 AND overlay_opacity <= 100),
  overlay_color VARCHAR(7) NOT NULL DEFAULT '#000000',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for quick lookups by project
CREATE INDEX idx_photo_book_covers_project_id ON photo_book_covers(project_id);

-- Add RLS policies
ALTER TABLE photo_book_covers ENABLE ROW LEVEL SECURITY;

-- Users can only access covers for their own projects
CREATE POLICY photo_book_covers_user_select ON photo_book_covers
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM photo_book_projects
      WHERE user_id = auth.uid()
    )
  );

-- Users can only create covers for their own projects
CREATE POLICY photo_book_covers_user_insert ON photo_book_covers
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM photo_book_projects
      WHERE user_id = auth.uid()
    )
  );

-- Users can only update covers for their own projects
CREATE POLICY photo_book_covers_user_update ON photo_book_covers
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM photo_book_projects
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM photo_book_projects
      WHERE user_id = auth.uid()
    )
  );

-- Users can only delete covers for their own projects
CREATE POLICY photo_book_covers_user_delete ON photo_book_covers
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM photo_book_projects
      WHERE user_id = auth.uid()
    )
  );

-- Update updated_at on row update
CREATE OR REPLACE FUNCTION update_photo_book_covers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photo_book_covers_updated_at
  BEFORE UPDATE ON photo_book_covers
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_book_covers_updated_at();

-- Comments
COMMENT ON TABLE photo_book_covers IS 'Cover designs for photo book projects';
COMMENT ON COLUMN photo_book_covers.layout IS 'Layout style: full-bleed, framed, top-image, bottom-image';
COMMENT ON COLUMN photo_book_covers.text_position IS 'Text position: center, top, bottom';
COMMENT ON COLUMN photo_book_covers.overlay_opacity IS 'Photo overlay opacity (0-100)';
