-- ============================================================================
-- VelloPad Events and Campaigns Schema
-- Feature: DB-005
-- Migration: 20260121000007
-- ============================================================================

-- This migration creates tables for:
-- 1. Events (product analytics and user activity)
-- 2. Campaigns (marketing email campaigns)
-- 3. Email sends (lifecycle and campaign email tracking)
-- 4. Email templates (reusable email templates)

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

    -- Event details
    event_name VARCHAR(100) NOT NULL, -- e.g., 'book_created', 'chapter_saved', 'order_placed'
    event_category VARCHAR(50), -- 'auth', 'book', 'commerce', 'engagement'

    -- Event metadata
    properties JSONB DEFAULT '{}'::JSONB, -- Flexible event properties

    -- User context
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,

    -- Session tracking
    session_id VARCHAR(100),

    -- Timestamps
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for events table
CREATE INDEX idx_events_workspace_id ON events(workspace_id);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_book_id ON events(book_id) WHERE book_id IS NOT NULL;
CREATE INDEX idx_events_order_id ON events(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_events_event_name ON events(event_name);
CREATE INDEX idx_events_event_category ON events(event_category);
CREATE INDEX idx_events_event_timestamp ON events(event_timestamp DESC);
CREATE INDEX idx_events_session_id ON events(session_id) WHERE session_id IS NOT NULL;

-- JSONB index for property queries
CREATE INDEX idx_events_properties ON events USING GIN(properties);

-- ============================================================================
-- EMAIL TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template details
    template_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'activation_nudge', 'stalled_writer'
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    template_category VARCHAR(50), -- 'lifecycle', 'transactional', 'campaign'

    -- Email content
    subject_line VARCHAR(255) NOT NULL,
    preview_text VARCHAR(255),
    html_body TEXT NOT NULL,
    text_body TEXT,

    -- Template variables
    variables JSONB DEFAULT '[]'::JSONB, -- Array of variable names like ['first_name', 'book_title']

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for email_templates
CREATE INDEX idx_email_templates_template_key ON email_templates(template_key);
CREATE INDEX idx_email_templates_category ON email_templates(template_category);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);

-- ============================================================================
-- EMAIL SENDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

    -- Email details
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,

    -- Email type
    email_type VARCHAR(50) NOT NULL, -- 'lifecycle', 'transactional', 'campaign'
    trigger_event VARCHAR(100), -- e.g., 'book_created', 'order_placed', 'user_stalled'

    -- Sending metadata
    provider VARCHAR(50) NOT NULL DEFAULT 'resend', -- resend, sendgrid, ses
    provider_message_id VARCHAR(255),

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, delivered, bounced, failed, opened, clicked

    -- Engagement metrics
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,

    -- Error handling
    error_message TEXT,
    retry_count INT DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for email_sends
CREATE INDEX idx_email_sends_workspace_id ON email_sends(workspace_id);
CREATE INDEX idx_email_sends_user_id ON email_sends(user_id);
CREATE INDEX idx_email_sends_template_id ON email_sends(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX idx_email_sends_campaign_id ON email_sends(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_email_sends_status ON email_sends(status);
CREATE INDEX idx_email_sends_email_type ON email_sends(email_type);
CREATE INDEX idx_email_sends_sent_at ON email_sends(sent_at DESC NULLS LAST);
CREATE INDEX idx_email_sends_provider_message_id ON email_sends(provider_message_id) WHERE provider_message_id IS NOT NULL;

-- ============================================================================
-- CAMPAIGNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Campaign details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) NOT NULL, -- 'one_time', 'recurring', 'triggered'

    -- Email content
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    subject_override VARCHAR(255), -- Override template subject

    -- Targeting
    segment_filter JSONB DEFAULT '{}'::JSONB, -- User/workspace filter criteria

    -- Scheduling
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, sent, paused, cancelled
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Stats
    recipients_count INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    opened_count INT DEFAULT 0,
    clicked_count INT DEFAULT 0,
    bounced_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,

    -- Creator
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for campaigns
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_campaign_type ON campaigns(campaign_type);
CREATE INDEX idx_campaigns_scheduled_at ON campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by) WHERE created_by IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Users can read events in their workspaces"
    ON events FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can create events in their workspaces"
    ON events FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

-- Email templates policies (global templates visible to all)
CREATE POLICY "All users can read active email templates"
    ON email_templates FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage email templates"
    ON email_templates FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM workspace_members WHERE role = 'owner'));

-- Email sends policies
CREATE POLICY "Users can read their email history"
    ON email_sends FOR SELECT
    USING (
        user_id = auth.uid()
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "System can create email sends"
    ON email_sends FOR INSERT
    WITH CHECK (true); -- Email sends created by system/background jobs

-- Campaigns policies
CREATE POLICY "Workspace admins can read campaigns"
    ON campaigns FOR SELECT
    USING (
        created_by IN (
            SELECT user_id FROM workspace_members WHERE role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Workspace admins can manage campaigns"
    ON campaigns FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM workspace_members WHERE role IN ('owner', 'admin')
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get event statistics for a workspace
CREATE OR REPLACE FUNCTION get_workspace_event_stats(p_workspace_id UUID)
RETURNS TABLE (
    event_name VARCHAR,
    event_count BIGINT,
    last_event_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.event_name,
        COUNT(*) as event_count,
        MAX(e.event_timestamp) as last_event_at
    FROM events e
    WHERE e.workspace_id = p_workspace_id
    GROUP BY e.event_name
    ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get email campaign statistics
CREATE OR REPLACE FUNCTION get_campaign_stats(p_campaign_id UUID)
RETURNS TABLE (
    total_sent INT,
    total_delivered INT,
    total_opened INT,
    total_clicked INT,
    total_bounced INT,
    total_failed INT,
    open_rate NUMERIC,
    click_rate NUMERIC,
    bounce_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INT as total_sent,
        COUNT(*) FILTER (WHERE status = 'delivered')::INT as total_delivered,
        COUNT(*) FILTER (WHERE status = 'opened' OR opened_at IS NOT NULL)::INT as total_opened,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::INT as total_clicked,
        COUNT(*) FILTER (WHERE status = 'bounced')::INT as total_bounced,
        COUNT(*) FILTER (WHERE status = 'failed')::INT as total_failed,

        ROUND(
            CASE
                WHEN COUNT(*) > 0
                THEN (COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::NUMERIC / COUNT(*)::NUMERIC) * 100
                ELSE 0
            END, 2
        ) as open_rate,

        ROUND(
            CASE
                WHEN COUNT(*) > 0
                THEN (COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::NUMERIC / COUNT(*)::NUMERIC) * 100
                ELSE 0
            END, 2
        ) as click_rate,

        ROUND(
            CASE
                WHEN COUNT(*) > 0
                THEN (COUNT(*) FILTER (WHERE status = 'bounced')::NUMERIC / COUNT(*)::NUMERIC) * 100
                ELSE 0
            END, 2
        ) as bounce_rate
    FROM email_sends
    WHERE campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user engagement score
CREATE OR REPLACE FUNCTION get_user_engagement_score(p_user_id UUID, p_days INT DEFAULT 30)
RETURNS NUMERIC AS $$
DECLARE
    v_score NUMERIC := 0;
    v_event_count INT;
    v_days_active INT;
    v_last_active_days INT;
BEGIN
    -- Count events in last N days
    SELECT COUNT(*) INTO v_event_count
    FROM events
    WHERE user_id = p_user_id
    AND event_timestamp > NOW() - (p_days || ' days')::INTERVAL;

    -- Count distinct active days
    SELECT COUNT(DISTINCT DATE(event_timestamp)) INTO v_days_active
    FROM events
    WHERE user_id = p_user_id
    AND event_timestamp > NOW() - (p_days || ' days')::INTERVAL;

    -- Days since last activity
    SELECT EXTRACT(DAY FROM NOW() - MAX(event_timestamp))::INT INTO v_last_active_days
    FROM events
    WHERE user_id = p_user_id;

    -- Calculate score (0-100)
    v_score := LEAST(100, (
        (v_event_count * 0.5) + -- Events contribute 50%
        (v_days_active * 3) + -- Active days contribute 30%
        (GREATEST(0, 20 - COALESCE(v_last_active_days, 30))) -- Recency contributes 20%
    ));

    RETURN ROUND(v_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_sends_updated_at
    BEFORE UPDATE ON email_sends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Default Email Templates
-- ============================================================================

INSERT INTO email_templates (template_key, template_name, description, template_category, subject_line, preview_text, html_body, text_body, variables) VALUES

-- Activation email
('activation_welcome', 'Welcome Activation Email', 'Welcome email sent immediately after signup', 'lifecycle',
'Welcome to VelloPad! Let''s create your first book',
'Start your publishing journey today',
'<html><body><h1>Welcome to VelloPad, {{first_name}}!</h1><p>We''re excited to help you create and publish your book.</p><p><a href="{{dashboard_url}}">Get Started →</a></p></body></html>',
'Welcome to VelloPad, {{first_name}}! We''re excited to help you create and publish your book. Get started: {{dashboard_url}}',
'["first_name", "dashboard_url"]'::JSONB),

-- Stalled writer
('stalled_writer', 'Stalled Writer Nudge', 'Sent when user hasn''t written in 3 days', 'lifecycle',
'Don''t lose momentum on {{book_title}}',
'Your book is waiting for you',
'<html><body><h1>Keep writing, {{first_name}}!</h1><p>You haven''t worked on "{{book_title}}" in a few days. Don''t lose your momentum!</p><p><a href="{{book_url}}">Continue writing →</a></p></body></html>',
'Keep writing, {{first_name}}! You haven''t worked on "{{book_title}}" in a few days. Continue writing: {{book_url}}',
'["first_name", "book_title", "book_url"]'::JSONB),

-- First draft complete
('first_draft_complete', 'First Draft Complete', 'Sent when book reaches 100% completion', 'lifecycle',
'🎉 Congratulations on finishing your first draft!',
'You did it! What''s next?',
'<html><body><h1>Amazing work, {{first_name}}!</h1><p>You''ve completed the first draft of "{{book_title}}"! Now it''s time to get your book printed.</p><p><a href="{{order_url}}">Order Your Proof Copy →</a></p></body></html>',
'Amazing work, {{first_name}}! You''ve completed the first draft of "{{book_title}}"! Order your proof copy: {{order_url}}',
'["first_name", "book_title", "order_url"]'::JSONB),

-- Order confirmation
('order_confirmation', 'Order Confirmation', 'Sent when order is placed', 'transactional',
'Order Confirmed: {{order_number}}',
'Your book is on its way!',
'<html><body><h1>Order Confirmed!</h1><p>Thanks for your order, {{first_name}}. Your order {{order_number}} is being processed.</p><p><a href="{{order_url}}">Track Your Order →</a></p></body></html>',
'Order Confirmed! Thanks for your order, {{first_name}}. Your order {{order_number}} is being processed. Track: {{order_url}}',
'["first_name", "order_number", "order_url"]'::JSONB),

-- Order shipped
('order_shipped', 'Order Shipped', 'Sent when order ships', 'transactional',
'Your book has shipped! 📦',
'Track your delivery',
'<html><body><h1>Your book is on the way!</h1><p>Order {{order_number}} has shipped. Tracking: {{tracking_number}}</p><p><a href="{{tracking_url}}">Track Shipment →</a></p></body></html>',
'Your book is on the way! Order {{order_number}} has shipped. Tracking: {{tracking_number}}. Track: {{tracking_url}}',
'["order_number", "tracking_number", "tracking_url"]'::JSONB);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE events IS 'Product analytics events for tracking user activity';
COMMENT ON TABLE email_templates IS 'Reusable email templates for lifecycle and campaign emails';
COMMENT ON TABLE email_sends IS 'Log of all emails sent to users';
COMMENT ON TABLE campaigns IS 'Marketing email campaigns sent to user segments';

COMMENT ON FUNCTION get_workspace_event_stats(UUID) IS 'Get event statistics for a workspace';
COMMENT ON FUNCTION get_campaign_stats(UUID) IS 'Get detailed statistics for an email campaign';
COMMENT ON FUNCTION get_user_engagement_score(UUID, INT) IS 'Calculate user engagement score (0-100) based on activity';
