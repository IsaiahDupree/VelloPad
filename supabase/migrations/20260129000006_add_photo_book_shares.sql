-- ================================================
-- PB-028: Shareable Preview Links
-- Migration: Create photo_book_shares table
-- ================================================
-- Feature: PB-028 - Shareable Preview Links
-- Generate shareable links for photo book previews
--
-- Features:
-- - Generate unique share tokens
-- - Track shares and previews
-- - Set expiration dates
-- - Enable/disable sharing

-- ================================================
-- Table: photo_book_shares
-- ================================================

CREATE TABLE IF NOT EXISTS photo_book_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES photo_book_projects(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Share control
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,

  -- Analytics
  view_count integer NOT NULL DEFAULT 0,

  -- Metadata
  metadata jsonb DEFAULT NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_token CHECK (share_token ~ '^[a-zA-Z0-9_-]{16}$')
);

-- ================================================
-- Indexes for Performance
-- ================================================

CREATE INDEX IF NOT EXISTS idx_photo_book_shares_token
ON photo_book_shares(share_token) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_photo_book_shares_project_id
ON photo_book_shares(project_id);

CREATE INDEX IF NOT EXISTS idx_photo_book_shares_created_by
ON photo_book_shares(created_by);

CREATE INDEX IF NOT EXISTS idx_photo_book_shares_created_at
ON photo_book_shares(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_photo_book_shares_active
ON photo_book_shares(is_active, expires_at)
WHERE is_active = true AND (expires_at IS NULL OR expires_at > now());

-- ================================================
-- Updated At Trigger
-- ================================================

CREATE OR REPLACE FUNCTION update_photo_book_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photo_book_shares_updated_at
  BEFORE UPDATE ON photo_book_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_book_shares_updated_at();

-- ================================================
-- Helper Functions
-- ================================================

-- Get active share by token
CREATE OR REPLACE FUNCTION get_active_share(token_param text)
RETURNS photo_book_shares AS $$
BEGIN
  RETURN (
    SELECT * FROM photo_book_shares
    WHERE share_token = token_param
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Get share statistics for a project
CREATE OR REPLACE FUNCTION get_share_stats(project_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_shares', COUNT(*),
    'active_shares', SUM(CASE WHEN is_active THEN 1 ELSE 0 END),
    'total_views', COALESCE(SUM(view_count), 0),
    'expired_shares', SUM(CASE WHEN expires_at < now() THEN 1 ELSE 0 END)
  ) INTO result
  FROM photo_book_shares
  WHERE project_id = project_id_param;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Increment view count for a share
CREATE OR REPLACE FUNCTION increment_share_views(share_id_param uuid)
RETURNS integer AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE photo_book_shares
  SET view_count = view_count + 1,
      updated_at = now()
  WHERE id = share_id_param
  RETURNING view_count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE photo_book_shares ENABLE ROW LEVEL SECURITY;

-- Public read access to active shares (for preview pages)
CREATE POLICY "Active shares are viewable by everyone"
  ON photo_book_shares
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Users can manage their own shares
CREATE POLICY "Users can manage their own shares"
  ON photo_book_shares
  FOR ALL
  USING (auth.uid() = created_by OR auth.jwt() ->> 'role' = 'service_role');

-- ================================================
-- Comments for Documentation
-- ================================================

COMMENT ON TABLE photo_book_shares IS 'Shareable preview links for photo book projects';
COMMENT ON COLUMN photo_book_shares.share_token IS 'Unique, short-lived token for share link';
COMMENT ON COLUMN photo_book_shares.is_active IS 'Whether this share is currently enabled';
COMMENT ON COLUMN photo_book_shares.expires_at IS 'Optional expiration timestamp';
COMMENT ON COLUMN photo_book_shares.view_count IS 'Number of times preview has been viewed';

-- ================================================
-- Permissions
-- ================================================

GRANT SELECT ON photo_book_shares TO authenticated;
GRANT SELECT ON photo_book_shares TO anon;
GRANT ALL ON photo_book_shares TO service_role;

GRANT EXECUTE ON FUNCTION get_active_share TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_share TO anon;
GRANT EXECUTE ON FUNCTION get_share_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_share_stats TO service_role;
GRANT EXECUTE ON FUNCTION increment_share_views TO authenticated;
GRANT EXECUTE ON FUNCTION increment_share_views TO service_role;

-- ================================================
-- Migration Complete
-- ================================================

DO $$
BEGIN
  RAISE NOTICE 'PB-028 migration completed successfully';
  RAISE NOTICE 'Created: photo_book_shares table';
  RAISE NOTICE 'Created: 5 indexes';
  RAISE NOTICE 'Created: 3 helper functions';
  RAISE NOTICE 'Enabled: RLS for shares';
END $$;
