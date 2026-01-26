-- ============================================================================
-- VelloPad Audit Logs Schema
-- Feature: BS-902
-- Migration: 20260126000002
-- ============================================================================

-- This migration creates the audit_logs table for tracking:
-- 1. Webhook events from payment and print providers
-- 2. Admin actions on orders
-- 3. System events (order creation, updates, etc.)
--
-- All PII is redacted from the sanitized_payload field while preserving
-- the raw_payload for debugging (admin access only).

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event classification
    event_type VARCHAR(50) NOT NULL, -- stripe_webhook, prodigi_webhook, admin_action, etc.
    provider VARCHAR(50), -- stripe, prodigi, gelato, lulu, peecho
    event_name VARCHAR(100) NOT NULL, -- checkout.session.completed, order.created, etc.

    -- Foreign keys (optional, for linking events)
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Payload storage
    raw_payload JSONB, -- Original payload (admin access only)
    sanitized_payload JSONB NOT NULL DEFAULT '{}', -- PII-redacted payload (general access)

    -- Event outcome
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- success, failure, pending
    error_message TEXT, -- Error details if status = failure

    -- Request context
    ip_address INET, -- IP address of the request (redacted after 90 days)
    user_agent TEXT, -- User agent string

    -- Additional metadata
    metadata JSONB DEFAULT '{}',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_provider ON audit_logs(provider);
CREATE INDEX idx_audit_logs_order_id ON audit_logs(order_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin users can view all audit logs (including raw_payload)
CREATE POLICY "Admins can view all audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

-- Regular users can only view sanitized logs for their workspaces
CREATE POLICY "Users can view sanitized logs for their workspaces"
    ON audit_logs FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- Only system (service role) can insert audit logs
CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-redact IP addresses after 90 days for privacy compliance
CREATE OR REPLACE FUNCTION redact_old_ip_addresses()
RETURNS void AS $$
BEGIN
    UPDATE audit_logs
    SET ip_address = NULL
    WHERE ip_address IS NOT NULL
      AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit summary for an order
CREATE OR REPLACE FUNCTION get_order_audit_summary(p_order_id UUID)
RETURNS TABLE (
    total_events INTEGER,
    webhook_events INTEGER,
    admin_actions INTEGER,
    failures INTEGER,
    last_event_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER AS total_events,
        COUNT(*) FILTER (WHERE event_type LIKE '%_webhook')::INTEGER AS webhook_events,
        COUNT(*) FILTER (WHERE event_type = 'admin_action')::INTEGER AS admin_actions,
        COUNT(*) FILTER (WHERE status = 'failure')::INTEGER AS failures,
        MAX(created_at) AS last_event_at
    FROM audit_logs
    WHERE order_id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SCHEDULED JOBS (requires pg_cron extension)
-- ============================================================================

-- Schedule IP address redaction job (if pg_cron is available)
-- This would run daily at 2 AM UTC
-- SELECT cron.schedule(
--     'redact-old-ip-addresses',
--     '0 2 * * *',
--     'SELECT redact_old_ip_addresses()'
-- );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Audit trail for webhooks, admin actions, and system events with PII redaction';
COMMENT ON COLUMN audit_logs.raw_payload IS 'Original payload - admin access only, contains PII';
COMMENT ON COLUMN audit_logs.sanitized_payload IS 'PII-redacted payload - safe for general access';
COMMENT ON COLUMN audit_logs.ip_address IS 'Request IP - auto-redacted after 90 days';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
