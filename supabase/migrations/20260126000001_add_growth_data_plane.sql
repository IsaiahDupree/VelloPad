-- ============================================================================
-- VelloPad Growth Data Plane Schema
-- Feature: GDP-001
-- Migration: 20260126000001
-- ============================================================================
--
-- This migration creates the Growth Data Plane infrastructure for VelloPad:
-- 1. Person table (canonical user identity)
-- 2. Identity links (stitch together posthog, stripe, meta, resend IDs)
-- 3. Unified events table (normalized from all sources)
-- 4. Email message tracking (comprehensive email event history)
-- 5. Email events (granular email interactions)
-- 6. Subscriptions (Stripe subscription snapshot)
-- 7. Deals (revenue opportunities)
-- 8. Person features (computed engagement metrics)
-- 9. Segments (user cohorts for targeting)
--
-- ============================================================================

-- ============================================================================
-- PERSON TABLE (Canonical Identity)
-- ============================================================================
-- The single source of truth for each unique person across all platforms

CREATE TABLE IF NOT EXISTS person (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Primary email (canonical identifier)
    email VARCHAR(255) UNIQUE NOT NULL,

    -- Profile data
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(255),

    -- Contact info
    phone VARCHAR(50),

    -- Enrichment data
    timezone VARCHAR(50),
    country_code CHAR(2),
    city VARCHAR(100),

    -- User metadata
    properties JSONB DEFAULT '{}'::JSONB,

    -- Lifecycle tracking
    lifecycle_stage VARCHAR(50) DEFAULT 'lead', -- lead, activated, engaged, customer, churned
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Attribution
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    referrer TEXT,
    landing_page TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for person table
CREATE INDEX idx_person_email ON person(email);
CREATE INDEX idx_person_lifecycle_stage ON person(lifecycle_stage);
CREATE INDEX idx_person_first_seen_at ON person(first_seen_at DESC);
CREATE INDEX idx_person_last_seen_at ON person(last_seen_at DESC);
CREATE INDEX idx_person_utm_source ON person(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX idx_person_utm_campaign ON person(utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX idx_person_properties ON person USING GIN(properties);

-- ============================================================================
-- IDENTITY_LINK TABLE (Cross-Platform Identity Stitching)
-- ============================================================================
-- Links person records to external platform identifiers

CREATE TABLE IF NOT EXISTS identity_link (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to person
    person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

    -- External platform
    platform VARCHAR(50) NOT NULL, -- 'posthog', 'stripe', 'meta', 'resend', 'auth'
    external_id VARCHAR(255) NOT NULL, -- Platform-specific ID

    -- Metadata
    properties JSONB DEFAULT '{}'::JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one external_id per platform
    UNIQUE(platform, external_id)
);

-- Indexes for identity_link
CREATE INDEX idx_identity_link_person_id ON identity_link(person_id);
CREATE INDEX idx_identity_link_platform ON identity_link(platform);
CREATE INDEX idx_identity_link_external_id ON identity_link(platform, external_id);

-- ============================================================================
-- UNIFIED_EVENT TABLE (Normalized Events from All Sources)
-- ============================================================================
-- Single table for all event data from web, app, email, stripe, meta

CREATE TABLE IF NOT EXISTS unified_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to person
    person_id UUID REFERENCES person(id) ON DELETE SET NULL,

    -- Event details
    event_name VARCHAR(100) NOT NULL, -- 'book_created', 'email.clicked', 'purchase', etc.
    event_source VARCHAR(50) NOT NULL, -- 'web', 'app', 'email', 'stripe', 'meta', 'booking'

    -- Event timestamp
    event_timestamp TIMESTAMPTZ NOT NULL,

    -- Event properties
    properties JSONB DEFAULT '{}'::JSONB,

    -- Session tracking
    session_id VARCHAR(100),

    -- Attribution (for web events)
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),

    -- Raw event data (for debugging)
    raw_event JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for unified_event
CREATE INDEX idx_unified_event_person_id ON unified_event(person_id);
CREATE INDEX idx_unified_event_event_name ON unified_event(event_name);
CREATE INDEX idx_unified_event_event_source ON unified_event(event_source);
CREATE INDEX idx_unified_event_event_timestamp ON unified_event(event_timestamp DESC);
CREATE INDEX idx_unified_event_session_id ON unified_event(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_unified_event_properties ON unified_event USING GIN(properties);

-- Composite index for person event queries
CREATE INDEX idx_unified_event_person_name_time ON unified_event(person_id, event_name, event_timestamp DESC);

-- ============================================================================
-- EMAIL_MESSAGE TABLE (Email Sending History)
-- ============================================================================
-- Comprehensive tracking of all emails sent (lifecycle, transactional, campaign)

CREATE TABLE IF NOT EXISTS email_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to person
    person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

    -- Email details
    to_email VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,

    -- Email type
    email_type VARCHAR(50) NOT NULL, -- 'lifecycle', 'transactional', 'campaign'
    campaign_id UUID, -- Optional campaign reference

    -- Template info
    template_key VARCHAR(100),

    -- Provider tracking
    provider VARCHAR(50) NOT NULL DEFAULT 'resend', -- 'resend', 'sendgrid', 'ses'
    provider_message_id VARCHAR(255), -- Provider's unique message ID

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'queued', -- queued, sent, delivered, opened, clicked, bounced, failed

    -- Event timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    first_clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    complained_at TIMESTAMPTZ,

    -- Engagement metrics
    open_count INT DEFAULT 0,
    click_count INT DEFAULT 0,

    -- Error handling
    error_message TEXT,

    -- Metadata
    tags JSONB DEFAULT '[]'::JSONB, -- Array of tags for grouping/filtering
    properties JSONB DEFAULT '{}'::JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for email_message
CREATE INDEX idx_email_message_person_id ON email_message(person_id);
CREATE INDEX idx_email_message_email_type ON email_message(email_type);
CREATE INDEX idx_email_message_campaign_id ON email_message(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_email_message_template_key ON email_message(template_key) WHERE template_key IS NOT NULL;
CREATE INDEX idx_email_message_status ON email_message(status);
CREATE INDEX idx_email_message_provider_message_id ON email_message(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX idx_email_message_sent_at ON email_message(sent_at DESC NULLS LAST);
CREATE INDEX idx_email_message_tags ON email_message USING GIN(tags);

-- ============================================================================
-- EMAIL_EVENT TABLE (Granular Email Interaction Events)
-- ============================================================================
-- Individual email events (opens, clicks, bounces, etc.)

CREATE TABLE IF NOT EXISTS email_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    email_message_id UUID NOT NULL REFERENCES email_message(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

    -- Event type
    event_type VARCHAR(50) NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'

    -- Event timestamp
    event_timestamp TIMESTAMPTZ NOT NULL,

    -- Click tracking (for clicked events)
    clicked_url TEXT,

    -- User agent and IP (for opens/clicks)
    user_agent TEXT,
    ip_address INET,

    -- Geolocation (if available)
    country_code CHAR(2),
    city VARCHAR(100),

    -- Provider data
    provider_event_id VARCHAR(255), -- Provider's unique event ID

    -- Raw event payload (for debugging)
    raw_event JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for email_event
CREATE INDEX idx_email_event_email_message_id ON email_event(email_message_id);
CREATE INDEX idx_email_event_person_id ON email_event(person_id);
CREATE INDEX idx_email_event_event_type ON email_event(event_type);
CREATE INDEX idx_email_event_event_timestamp ON email_event(event_timestamp DESC);
CREATE INDEX idx_email_event_clicked_url ON email_event(clicked_url) WHERE clicked_url IS NOT NULL;

-- ============================================================================
-- SUBSCRIPTION TABLE (Stripe Subscription Snapshot)
-- ============================================================================
-- Current subscription status for each person

CREATE TABLE IF NOT EXISTS subscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to person
    person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

    -- Stripe identifiers
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,

    -- Subscription details
    plan_name VARCHAR(100) NOT NULL,
    plan_id VARCHAR(100) NOT NULL,

    -- Billing
    status VARCHAR(50) NOT NULL, -- 'active', 'trialing', 'past_due', 'canceled', 'unpaid'
    billing_interval VARCHAR(20), -- 'month', 'year'
    currency CHAR(3) DEFAULT 'USD',
    amount_cents INT NOT NULL,
    mrr_cents INT, -- Monthly Recurring Revenue in cents

    -- Dates
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,

    -- Metadata
    properties JSONB DEFAULT '{}'::JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for subscription
CREATE INDEX idx_subscription_person_id ON subscription(person_id);
CREATE INDEX idx_subscription_stripe_customer_id ON subscription(stripe_customer_id);
CREATE INDEX idx_subscription_stripe_subscription_id ON subscription(stripe_subscription_id);
CREATE INDEX idx_subscription_status ON subscription(status);
CREATE INDEX idx_subscription_current_period_end ON subscription(current_period_end);

-- ============================================================================
-- DEAL TABLE (Revenue Opportunities)
-- ============================================================================
-- Track potential and closed revenue deals

CREATE TABLE IF NOT EXISTS deal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to person
    person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

    -- Deal details
    deal_name VARCHAR(255) NOT NULL,
    deal_stage VARCHAR(50) NOT NULL, -- 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'

    -- Revenue
    currency CHAR(3) DEFAULT 'USD',
    amount_cents INT NOT NULL,

    -- Probability of closing (0-100)
    win_probability INT DEFAULT 50,

    -- Expected close date
    expected_close_date DATE,

    -- Actual close date
    closed_at TIMESTAMPTZ,

    -- Deal source
    source VARCHAR(100), -- 'inbound', 'outbound', 'referral', 'partner'

    -- Owner
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Metadata
    properties JSONB DEFAULT '{}'::JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for deal
CREATE INDEX idx_deal_person_id ON deal(person_id);
CREATE INDEX idx_deal_deal_stage ON deal(deal_stage);
CREATE INDEX idx_deal_owner_user_id ON deal(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX idx_deal_expected_close_date ON deal(expected_close_date) WHERE expected_close_date IS NOT NULL;
CREATE INDEX idx_deal_closed_at ON deal(closed_at DESC NULLS LAST);

-- ============================================================================
-- PERSON_FEATURES TABLE (Computed Engagement Metrics)
-- ============================================================================
-- Pre-computed features for segmentation and personalization

CREATE TABLE IF NOT EXISTS person_features (
    person_id UUID PRIMARY KEY REFERENCES person(id) ON DELETE CASCADE,

    -- Activity metrics
    active_days_7d INT DEFAULT 0,
    active_days_30d INT DEFAULT 0,
    active_days_90d INT DEFAULT 0,

    -- Event counts
    total_events INT DEFAULT 0,
    events_7d INT DEFAULT 0,
    events_30d INT DEFAULT 0,

    -- Core action counts (VelloPad-specific)
    books_created INT DEFAULT 0,
    chapters_written INT DEFAULT 0,
    words_written INT DEFAULT 0,
    pdfs_generated INT DEFAULT 0,
    orders_placed INT DEFAULT 0,

    -- Engagement indicators
    pricing_views INT DEFAULT 0,
    template_previews INT DEFAULT 0,

    -- Email engagement
    emails_sent INT DEFAULT 0,
    emails_opened INT DEFAULT 0,
    emails_clicked INT DEFAULT 0,
    email_open_rate NUMERIC(5, 2), -- Percentage
    email_click_rate NUMERIC(5, 2), -- Percentage

    -- Subscription metrics
    is_subscriber BOOLEAN DEFAULT false,
    subscription_mrr_cents INT,

    -- Revenue metrics
    total_revenue_cents INT DEFAULT 0,
    first_purchase_at TIMESTAMPTZ,
    last_purchase_at TIMESTAMPTZ,

    -- Computed scores (0-100)
    engagement_score INT DEFAULT 0,
    activation_score INT DEFAULT 0,
    churn_risk_score INT DEFAULT 0,

    -- Last activity
    last_active_at TIMESTAMPTZ,

    -- Computed timestamp
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for person_features
CREATE INDEX idx_person_features_active_days_30d ON person_features(active_days_30d DESC);
CREATE INDEX idx_person_features_engagement_score ON person_features(engagement_score DESC);
CREATE INDEX idx_person_features_churn_risk_score ON person_features(churn_risk_score DESC);
CREATE INDEX idx_person_features_is_subscriber ON person_features(is_subscriber);
CREATE INDEX idx_person_features_last_active_at ON person_features(last_active_at DESC NULLS LAST);

-- ============================================================================
-- SEGMENT TABLE (User Cohorts for Targeting)
-- ============================================================================
-- Define and track user segments for campaigns and analysis

CREATE TABLE IF NOT EXISTS segment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Segment details
    segment_name VARCHAR(100) UNIQUE NOT NULL,
    segment_key VARCHAR(100) UNIQUE NOT NULL, -- Machine-readable key
    description TEXT,

    -- Segment definition (SQL WHERE clause or JSONB filter)
    filter_criteria JSONB NOT NULL, -- Filter rules

    -- Segment type
    segment_type VARCHAR(50) NOT NULL, -- 'static', 'dynamic', 'behavioral'

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Stats
    member_count INT DEFAULT 0,
    last_computed_at TIMESTAMPTZ,

    -- Metadata
    properties JSONB DEFAULT '{}'::JSONB,

    -- Creator
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for segment
CREATE INDEX idx_segment_segment_key ON segment(segment_key);
CREATE INDEX idx_segment_segment_type ON segment(segment_type);
CREATE INDEX idx_segment_is_active ON segment(is_active);
CREATE INDEX idx_segment_created_by ON segment(created_by) WHERE created_by IS NOT NULL;

-- ============================================================================
-- SEGMENT_MEMBERSHIP TABLE (Track Which Persons Belong to Which Segments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS segment_membership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    segment_id UUID NOT NULL REFERENCES segment(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

    -- Membership tracking
    entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exited_at TIMESTAMPTZ,

    -- Metadata
    properties JSONB DEFAULT '{}'::JSONB,

    -- Unique constraint: person can only be in segment once at a time
    UNIQUE(segment_id, person_id)
);

-- Indexes for segment_membership
CREATE INDEX idx_segment_membership_segment_id ON segment_membership(segment_id);
CREATE INDEX idx_segment_membership_person_id ON segment_membership(person_id);
CREATE INDEX idx_segment_membership_entered_at ON segment_membership(entered_at DESC);
CREATE INDEX idx_segment_membership_active ON segment_membership(segment_id, person_id) WHERE exited_at IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE person ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_membership ENABLE ROW LEVEL SECURITY;

-- Person policies (admins only)
CREATE POLICY "Admins can read all persons"
    ON person FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "System can manage persons"
    ON person FOR ALL
    USING (true); -- Allow system operations

-- Identity link policies (admins only)
CREATE POLICY "Admins can read identity links"
    ON identity_link FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "System can manage identity links"
    ON identity_link FOR ALL
    USING (true);

-- Unified event policies (admins only)
CREATE POLICY "Admins can read unified events"
    ON unified_event FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "System can create unified events"
    ON unified_event FOR INSERT
    WITH CHECK (true);

-- Email message policies
CREATE POLICY "Admins can read email messages"
    ON email_message FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "System can manage email messages"
    ON email_message FOR ALL
    USING (true);

-- Email event policies
CREATE POLICY "Admins can read email events"
    ON email_event FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "System can create email events"
    ON email_event FOR INSERT
    WITH CHECK (true);

-- Subscription policies
CREATE POLICY "Admins can read subscriptions"
    ON subscription FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "System can manage subscriptions"
    ON subscription FOR ALL
    USING (true);

-- Deal policies
CREATE POLICY "Admins can read deals"
    ON deal FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can manage deals"
    ON deal FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Person features policies
CREATE POLICY "Admins can read person features"
    ON person_features FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "System can manage person features"
    ON person_features FOR ALL
    USING (true);

-- Segment policies
CREATE POLICY "Admins can read segments"
    ON segment FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can manage segments"
    ON segment FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Segment membership policies
CREATE POLICY "Admins can read segment membership"
    ON segment_membership FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "System can manage segment membership"
    ON segment_membership FOR ALL
    USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Link person to external platform
CREATE OR REPLACE FUNCTION link_person_identity(
    p_person_id UUID,
    p_platform VARCHAR(50),
    p_external_id VARCHAR(255),
    p_properties JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_link_id UUID;
BEGIN
    INSERT INTO identity_link (person_id, platform, external_id, properties)
    VALUES (p_person_id, p_platform, p_external_id, p_properties)
    ON CONFLICT (platform, external_id)
    DO UPDATE SET
        person_id = EXCLUDED.person_id,
        properties = EXCLUDED.properties,
        updated_at = NOW()
    RETURNING id INTO v_link_id;

    RETURN v_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get or create person by email
CREATE OR REPLACE FUNCTION get_or_create_person(
    p_email VARCHAR(255),
    p_first_name VARCHAR(100) DEFAULT NULL,
    p_last_name VARCHAR(100) DEFAULT NULL,
    p_properties JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_person_id UUID;
BEGIN
    -- Try to find existing person
    SELECT id INTO v_person_id
    FROM person
    WHERE email = p_email;

    -- Create if not exists
    IF v_person_id IS NULL THEN
        INSERT INTO person (email, first_name, last_name, properties)
        VALUES (p_email, p_first_name, p_last_name, p_properties)
        RETURNING id INTO v_person_id;
    END IF;

    RETURN v_person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Compute person features
CREATE OR REPLACE FUNCTION compute_person_features(p_person_id UUID)
RETURNS VOID AS $$
DECLARE
    v_active_days_7d INT;
    v_active_days_30d INT;
    v_events_7d INT;
    v_events_30d INT;
    v_books_created INT;
    v_words_written INT;
    v_emails_sent INT;
    v_emails_opened INT;
    v_engagement_score INT;
BEGIN
    -- Count active days
    SELECT COUNT(DISTINCT DATE(event_timestamp)) INTO v_active_days_7d
    FROM unified_event
    WHERE person_id = p_person_id
    AND event_timestamp > NOW() - INTERVAL '7 days';

    SELECT COUNT(DISTINCT DATE(event_timestamp)) INTO v_active_days_30d
    FROM unified_event
    WHERE person_id = p_person_id
    AND event_timestamp > NOW() - INTERVAL '30 days';

    -- Count events
    SELECT COUNT(*) INTO v_events_7d
    FROM unified_event
    WHERE person_id = p_person_id
    AND event_timestamp > NOW() - INTERVAL '7 days';

    SELECT COUNT(*) INTO v_events_30d
    FROM unified_event
    WHERE person_id = p_person_id
    AND event_timestamp > NOW() - INTERVAL '30 days';

    -- Count books created
    SELECT COUNT(*) INTO v_books_created
    FROM unified_event
    WHERE person_id = p_person_id
    AND event_name = 'book_created';

    -- Count total words written (sum from word_count_milestone events)
    SELECT COALESCE(SUM((properties->>'current_word_count')::INT), 0) INTO v_words_written
    FROM unified_event
    WHERE person_id = p_person_id
    AND event_name = 'word_count_milestone';

    -- Email metrics
    SELECT COUNT(*) INTO v_emails_sent
    FROM email_message
    WHERE person_id = p_person_id;

    SELECT COUNT(*) INTO v_emails_opened
    FROM email_message
    WHERE person_id = p_person_id
    AND opened_at IS NOT NULL;

    -- Calculate engagement score (0-100)
    v_engagement_score := LEAST(100, (
        (v_active_days_30d * 3) + -- Active days weight
        (LEAST(v_events_30d, 50) * 1) + -- Event count weight (capped at 50)
        (v_books_created * 10) -- Book creation weight
    ));

    -- Upsert person_features
    INSERT INTO person_features (
        person_id,
        active_days_7d,
        active_days_30d,
        events_7d,
        events_30d,
        books_created,
        words_written,
        emails_sent,
        emails_opened,
        engagement_score,
        computed_at
    ) VALUES (
        p_person_id,
        v_active_days_7d,
        v_active_days_30d,
        v_events_7d,
        v_events_30d,
        v_books_created,
        v_words_written,
        v_emails_sent,
        v_emails_opened,
        v_engagement_score,
        NOW()
    )
    ON CONFLICT (person_id)
    DO UPDATE SET
        active_days_7d = EXCLUDED.active_days_7d,
        active_days_30d = EXCLUDED.active_days_30d,
        events_7d = EXCLUDED.events_7d,
        events_30d = EXCLUDED.events_30d,
        books_created = EXCLUDED.books_created,
        words_written = EXCLUDED.words_written,
        emails_sent = EXCLUDED.emails_sent,
        emails_opened = EXCLUDED.emails_opened,
        engagement_score = EXCLUDED.engagement_score,
        computed_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gdp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_person_updated_at
    BEFORE UPDATE ON person
    FOR EACH ROW
    EXECUTE FUNCTION update_gdp_updated_at();

CREATE TRIGGER update_identity_link_updated_at
    BEFORE UPDATE ON identity_link
    FOR EACH ROW
    EXECUTE FUNCTION update_gdp_updated_at();

CREATE TRIGGER update_email_message_updated_at
    BEFORE UPDATE ON email_message
    FOR EACH ROW
    EXECUTE FUNCTION update_gdp_updated_at();

CREATE TRIGGER update_subscription_updated_at
    BEFORE UPDATE ON subscription
    FOR EACH ROW
    EXECUTE FUNCTION update_gdp_updated_at();

CREATE TRIGGER update_deal_updated_at
    BEFORE UPDATE ON deal
    FOR EACH ROW
    EXECUTE FUNCTION update_gdp_updated_at();

CREATE TRIGGER update_segment_updated_at
    BEFORE UPDATE ON segment
    FOR EACH ROW
    EXECUTE FUNCTION update_gdp_updated_at();

-- ============================================================================
-- SEED DATA: Default Segments
-- ============================================================================

INSERT INTO segment (segment_name, segment_key, description, segment_type, filter_criteria) VALUES

-- VelloPad-specific segments
('New Signups (No Book)', 'signup_no_book_48h', 'Users who signed up but haven''t created a book in 48 hours', 'dynamic',
 '{"lifecycle_stage": "lead", "books_created": 0, "hours_since_signup": {"$gte": 48}}'::JSONB),

('Book Created (No Words)', 'book_created_no_words_72h', 'Users who created a book but haven''t written in 72 hours', 'dynamic',
 '{"books_created": {"$gte": 1}, "words_written": 0, "hours_since_book_created": {"$gte": 72}}'::JSONB),

('Writing Streak Broken', 'writing_streak_broken', 'Users who had an active writing streak but haven''t written in 3+ days', 'dynamic',
 '{"active_days_7d": {"$gte": 3}, "hours_since_last_active": {"$gte": 72}}'::JSONB),

('10K Words (No PDF)', '10k_words_no_pdf', 'Users with 10K+ words but haven''t generated a PDF', 'dynamic',
 '{"words_written": {"$gte": 10000}, "pdfs_generated": 0}'::JSONB),

('PDF Generated (No Order)', 'pdf_generated_no_order', 'Users who generated a PDF but haven''t placed an order', 'dynamic',
 '{"pdfs_generated": {"$gte": 1}, "orders_placed": 0}'::JSONB),

('First Order Placed', 'first_order_placed', 'Users who just placed their first print order', 'behavioral',
 '{"orders_placed": 1, "days_since_first_order": {"$lte": 7}}'::JSONB),

('High Engagement', 'high_engagement', 'Users with engagement score > 70', 'dynamic',
 '{"engagement_score": {"$gte": 70}}'::JSONB),

('At Risk (Churn)', 'at_risk_churn', 'Users with high churn risk score', 'dynamic',
 '{"churn_risk_score": {"$gte": 60}, "is_subscriber": true}'::JSONB),

('Active Subscribers', 'active_subscribers', 'Users with active subscriptions', 'dynamic',
 '{"is_subscriber": true}'::JSONB),

('Email Engagers', 'email_engagers', 'Users who frequently open and click emails', 'dynamic',
 '{"email_open_rate": {"$gte": 40}, "email_click_rate": {"$gte": 10}}'::JSONB);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE person IS 'Canonical person identity across all platforms';
COMMENT ON TABLE identity_link IS 'Links person records to external platform identifiers (PostHog, Stripe, Meta, etc.)';
COMMENT ON TABLE unified_event IS 'Normalized events from all sources (web, app, email, stripe, booking, meta)';
COMMENT ON TABLE email_message IS 'Comprehensive email sending history with engagement tracking';
COMMENT ON TABLE email_event IS 'Granular email interaction events (opens, clicks, bounces)';
COMMENT ON TABLE subscription IS 'Stripe subscription snapshot with MRR tracking';
COMMENT ON TABLE deal IS 'Revenue opportunities and closed deals';
COMMENT ON TABLE person_features IS 'Pre-computed engagement metrics for segmentation';
COMMENT ON TABLE segment IS 'User cohort definitions for targeting and analysis';
COMMENT ON TABLE segment_membership IS 'Tracks which persons belong to which segments';

COMMENT ON FUNCTION get_or_create_person(VARCHAR, VARCHAR, VARCHAR, JSONB) IS 'Get existing person by email or create new person record';
COMMENT ON FUNCTION link_person_identity(UUID, VARCHAR, VARCHAR, JSONB) IS 'Link person to external platform identifier';
COMMENT ON FUNCTION compute_person_features(UUID) IS 'Compute engagement features for a person';
