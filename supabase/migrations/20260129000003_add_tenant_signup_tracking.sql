-- ================================================
-- MT-011: Customer Signup Tenant Tracking
-- Migration: Track signup tenant and interests
-- ================================================
-- Feature: MT-011 - Customer Signup Tenant Tracking
-- Track signup_tenant_id and interests[] for culture-matching segmentation
--
-- Adds:
-- - metadata JSONB column to profiles
-- - Fields: signup_tenant_id, interests[]
-- - Indexes for efficient querying

-- ================================================
-- Add Metadata Column to Profiles
-- ================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT jsonb_build_object();

-- ================================================
-- Create Indexes for Efficient Querying
-- ================================================

-- Index for signup_tenant_id lookups (for segmentation)
CREATE INDEX IF NOT EXISTS idx_profiles_signup_tenant_id
ON profiles USING btree ((metadata->>'signup_tenant_id'));

-- Index for interests array queries
CREATE INDEX IF NOT EXISTS idx_profiles_interests
ON profiles USING GIN ((metadata->'interests'));

-- ================================================
-- Helper Function: Update Profile Signup Tenant
-- ================================================

CREATE OR REPLACE FUNCTION update_profile_signup_tenant(
  user_id uuid,
  tenant_id uuid,
  interests text[] DEFAULT NULL
)
RETURNS profiles AS $$
DECLARE
  result profiles;
BEGIN
  UPDATE profiles
  SET metadata = jsonb_set(
    metadata,
    '{signup_tenant_id}',
    to_jsonb(tenant_id::text)
  ) || CASE
    WHEN interests IS NOT NULL THEN
      jsonb_build_object('interests', to_jsonb(interests))
    ELSE '{}'::jsonb
  END,
  updated_at = now()
  WHERE id = user_id
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Helper Function: Get Users by Signup Tenant
-- ================================================

CREATE OR REPLACE FUNCTION get_users_by_signup_tenant(tenant_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  signup_tenant_id uuid,
  interests text[],
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    (p.metadata->>'signup_tenant_id')::uuid,
    COALESCE(array_agg(DISTINCT interests), ARRAY[]::text[]) FILTER (WHERE interests IS NOT NULL),
    p.created_at
  FROM profiles p
  CROSS JOIN LATERAL (
    SELECT jsonb_array_elements(
      COALESCE(p.metadata->'interests', '[]'::jsonb)
    )->>0 AS interests
  ) interests_expand
  WHERE (p.metadata->>'signup_tenant_id')::uuid = tenant_id
  GROUP BY p.id, p.email, p.created_at;
END;
$$ LANGUAGE plpgsql STABLE;

-- ================================================
-- Helper Function: Get Users by Interest
-- ================================================

CREATE OR REPLACE FUNCTION get_users_by_interest(interest_name text)
RETURNS TABLE(
  user_id uuid,
  email text,
  signup_tenant_id uuid,
  interests text[],
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    (p.metadata->>'signup_tenant_id')::uuid,
    COALESCE(
      array_agg(DISTINCT elem),
      ARRAY[]::text[]
    ),
    p.created_at
  FROM profiles p,
  LATERAL jsonb_array_elements_text(
    COALESCE(p.metadata->'interests', '[]'::jsonb)
  ) AS elem
  WHERE elem = interest_name
  GROUP BY p.id, p.email, p.created_at;
END;
$$ LANGUAGE plpgsql STABLE;

-- ================================================
-- Comments for Documentation
-- ================================================

COMMENT ON COLUMN profiles.metadata IS 'JSONB metadata including signup_tenant_id, interests[]';
COMMENT ON FUNCTION update_profile_signup_tenant IS 'Updates user signup_tenant_id and interests for culture matching';
COMMENT ON FUNCTION get_users_by_signup_tenant IS 'Retrieve all users who signed up through a specific tenant';
COMMENT ON FUNCTION get_users_by_interest IS 'Retrieve all users with a specific interest';

-- ================================================
-- Permissions
-- ================================================

GRANT EXECUTE ON FUNCTION update_profile_signup_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_signup_tenant TO service_role;
GRANT EXECUTE ON FUNCTION get_users_by_signup_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_by_signup_tenant TO service_role;
GRANT EXECUTE ON FUNCTION get_users_by_interest TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_by_interest TO service_role;

-- ================================================
-- Migration Complete
-- ================================================

DO $$
BEGIN
  RAISE NOTICE 'MT-011 migration completed successfully';
  RAISE NOTICE 'Added: metadata column to profiles';
  RAISE NOTICE 'Created: 2 indexes for signup_tenant_id and interests';
  RAISE NOTICE 'Created: 3 helper functions';
END $$;
