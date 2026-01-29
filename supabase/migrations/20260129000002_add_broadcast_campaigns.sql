-- ===========================================
-- VelloPad: Broadcast Campaigns Migration
-- BS-703: Admin Broadcast Tool
-- ===========================================
-- Adds broadcast campaign support to existing campaigns table
-- and creates campaign-segment linking table

-- Add broadcast-specific fields to campaigns table
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS email_subject VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email_content TEXT,
  ADD COLUMN IF NOT EXISTS preview_text VARCHAR(255),
  ADD COLUMN IF NOT EXISTS segment_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS send_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivered_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opened_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_count INTEGER DEFAULT 0;

-- Create index for broadcast campaigns by type and status
CREATE INDEX IF NOT EXISTS idx_campaigns_broadcast
  ON campaigns(workspace_id, campaign_type, status)
  WHERE campaign_type = 'one_time';

-- Create campaign-segment link table for many-to-many relationship
CREATE TABLE IF NOT EXISTS campaign_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES segment(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, segment_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_segments_campaign ON campaign_segments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_segments_segment ON campaign_segments(segment_id);

-- Add email_sends table if not exists (for tracking individual sends)
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  email_message_id UUID REFERENCES email_message(id) ON DELETE SET NULL,

  -- Send metadata
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, delivered, bounced, failed
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate sends
  UNIQUE(campaign_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_person ON email_sends(person_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_sent_at ON email_sends(sent_at);

-- Function to update email_sends.updated_at
CREATE OR REPLACE FUNCTION update_email_sends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_sends_updated_at
  BEFORE UPDATE ON email_sends
  FOR EACH ROW
  EXECUTE FUNCTION update_email_sends_updated_at();

-- Function to update campaign stats when email_sends change
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign send counts
  UPDATE campaigns
  SET
    send_count = (
      SELECT COUNT(*)
      FROM email_sends
      WHERE campaign_id = NEW.campaign_id
    ),
    delivered_count = (
      SELECT COUNT(*)
      FROM email_sends
      WHERE campaign_id = NEW.campaign_id
        AND delivered_at IS NOT NULL
    ),
    opened_count = (
      SELECT COUNT(*)
      FROM email_sends
      WHERE campaign_id = NEW.campaign_id
        AND opened_at IS NOT NULL
    ),
    clicked_count = (
      SELECT COUNT(*)
      FROM email_sends
      WHERE campaign_id = NEW.campaign_id
        AND clicked_at IS NOT NULL
    )
  WHERE id = NEW.campaign_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_sends_update_campaign_stats
  AFTER INSERT OR UPDATE ON email_sends
  FOR EACH ROW
  WHEN (NEW.campaign_id IS NOT NULL)
  EXECUTE FUNCTION update_campaign_stats();

-- Row Level Security Policies

-- Campaigns: Admins only
CREATE POLICY IF NOT EXISTS "Admins can view campaigns"
  ON campaigns FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can update campaigns"
  ON campaigns FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can delete campaigns"
  ON campaigns FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Campaign segments: Admins only
CREATE POLICY IF NOT EXISTS "Admins can view campaign segments"
  ON campaign_segments FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can create campaign segments"
  ON campaign_segments FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can delete campaign segments"
  ON campaign_segments FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );

-- Email sends: Admins only
CREATE POLICY IF NOT EXISTS "Admins can view email sends"
  ON email_sends FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY IF NOT EXISTS "System can insert email sends"
  ON email_sends FOR INSERT
  WITH CHECK (true); -- API will validate permissions

CREATE POLICY IF NOT EXISTS "System can update email sends"
  ON email_sends FOR UPDATE
  USING (true); -- Webhooks need to update status

-- Add comment documentation
COMMENT ON TABLE campaign_segments IS 'Links campaigns to target segments for broadcast campaigns (BS-703)';
COMMENT ON TABLE email_sends IS 'Tracks individual email sends for campaign analytics and deduplication (BS-703)';
COMMENT ON COLUMN campaigns.email_subject IS 'Email subject line for broadcast campaigns';
COMMENT ON COLUMN campaigns.email_content IS 'Email body content (HTML or plain text) with template variables';
COMMENT ON COLUMN campaigns.preview_text IS 'Preview text shown in email clients';
COMMENT ON COLUMN campaigns.segment_ids IS 'Array of segment UUIDs to target for this campaign';
COMMENT ON COLUMN campaigns.send_count IS 'Total number of emails sent';
COMMENT ON COLUMN campaigns.delivered_count IS 'Number of successfully delivered emails';
COMMENT ON COLUMN campaigns.opened_count IS 'Number of opened emails';
COMMENT ON COLUMN campaigns.clicked_count IS 'Number of emails with link clicks';
