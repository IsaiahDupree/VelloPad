-- ============================================================================
-- Click Tracking Support Functions
-- Feature: GDP-006
-- Migration: 20260129000001
-- ============================================================================
--
-- This migration adds database functions to support click tracking:
-- 1. increment_email_click_count - Updates email_message click stats
-- 2. get_attribution_session - Retrieves attribution data for a session
--
-- ============================================================================

-- ============================================================================
-- Function: increment_email_click_count
-- Updates email_message table when a click occurs
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_email_click_count(message_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE email_message
  SET
    click_count = click_count + 1,
    first_clicked_at = COALESCE(first_clicked_at, NOW()),
    status = CASE
      WHEN status IN ('sent', 'delivered', 'opened') THEN 'clicked'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = message_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: get_attribution_session
-- Retrieves attribution data for a given session ID
-- ============================================================================

CREATE OR REPLACE FUNCTION get_attribution_session(session_id_param VARCHAR(100))
RETURNS TABLE (
  person_id UUID,
  email_message_id UUID,
  campaign_id UUID,
  first_event_name VARCHAR(100),
  first_event_timestamp TIMESTAMPTZ,
  last_event_name VARCHAR(100),
  last_event_timestamp TIMESTAMPTZ,
  event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ue.person_id,
    (ue.properties->>'email_message_id')::UUID as email_message_id,
    (ue.properties->>'campaign_id')::UUID as campaign_id,
    FIRST_VALUE(ue.event_name) OVER (ORDER BY ue.event_timestamp ASC) as first_event_name,
    FIRST_VALUE(ue.event_timestamp) OVER (ORDER BY ue.event_timestamp ASC) as first_event_timestamp,
    FIRST_VALUE(ue.event_name) OVER (ORDER BY ue.event_timestamp DESC) as last_event_name,
    FIRST_VALUE(ue.event_timestamp) OVER (ORDER BY ue.event_timestamp DESC) as last_event_timestamp,
    COUNT(*) OVER () as event_count
  FROM unified_event ue
  WHERE ue.session_id = session_id_param
  ORDER BY ue.event_timestamp ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: track_conversion_from_session
-- Links a conversion event to its email attribution
-- ============================================================================

CREATE OR REPLACE FUNCTION track_conversion_from_session(
  session_id_param VARCHAR(100),
  conversion_event_name VARCHAR(100),
  conversion_value_cents INT DEFAULT NULL,
  conversion_properties JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  person_id_var UUID;
  event_id_var UUID;
BEGIN
  -- Get person_id from session
  SELECT ue.person_id INTO person_id_var
  FROM unified_event ue
  WHERE ue.session_id = session_id_param
  ORDER BY ue.event_timestamp DESC
  LIMIT 1;

  -- If no person found, return NULL
  IF person_id_var IS NULL THEN
    RETURN NULL;
  END IF;

  -- Insert conversion event
  INSERT INTO unified_event (
    person_id,
    event_name,
    event_source,
    event_timestamp,
    session_id,
    properties
  ) VALUES (
    person_id_var,
    conversion_event_name,
    'web',
    NOW(),
    session_id_param,
    conversion_properties || jsonb_build_object('conversion_value_cents', conversion_value_cents)
  )
  RETURNING id INTO event_id_var;

  RETURN event_id_var;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Add indexes for session-based queries
-- ============================================================================

-- Index for quick session lookups (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_unified_event_session_id'
  ) THEN
    CREATE INDEX idx_unified_event_session_id ON unified_event(session_id)
    WHERE session_id IS NOT NULL;
  END IF;
END $$;

-- Composite index for person + session queries
CREATE INDEX IF NOT EXISTS idx_unified_event_person_session
ON unified_event(person_id, session_id, event_timestamp DESC)
WHERE session_id IS NOT NULL;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON FUNCTION increment_email_click_count IS
'Increments click count and updates status for an email message';

COMMENT ON FUNCTION get_attribution_session IS
'Returns attribution data for a given session ID';

COMMENT ON FUNCTION track_conversion_from_session IS
'Records a conversion event and links it to an email attribution session';
