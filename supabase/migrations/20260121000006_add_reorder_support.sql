-- ============================================================================
-- VelloPad Reorder Support
-- Feature: BS-504
-- Migration: 20260121000006
-- ============================================================================

-- This migration adds support for reordering from saved renditions:
-- 1. Add reorder tracking fields to quotes table
-- 2. Add reorder metadata to orders

-- ============================================================================
-- UPDATE QUOTES TABLE
-- ============================================================================

-- Add reorder tracking fields to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS original_order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- Create index for reorder queries
CREATE INDEX IF NOT EXISTS idx_quotes_is_reorder ON quotes(is_reorder) WHERE is_reorder = TRUE;
CREATE INDEX IF NOT EXISTS idx_quotes_original_order ON quotes(original_order_id);

-- ============================================================================
-- UPDATE ORDERS METADATA
-- ============================================================================

-- Update orders table comment to document reorder support
COMMENT ON COLUMN orders.metadata IS 'JSONB metadata including isReorder, originalOrderId, renditionId, etc.';

-- ============================================================================
-- HELPER FUNCTION: Get Reorder Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_reorder_stats(p_user_id UUID)
RETURNS TABLE(
    total_orders INTEGER,
    total_reorders INTEGER,
    reorder_rate NUMERIC,
    total_revenue_cents INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER AS total_orders,
        COUNT(*) FILTER (WHERE (metadata->>'isReorder')::BOOLEAN = TRUE)::INTEGER AS total_reorders,
        CASE
            WHEN COUNT(*) > 0 THEN
                ROUND(
                    (COUNT(*) FILTER (WHERE (metadata->>'isReorder')::BOOLEAN = TRUE)::NUMERIC / COUNT(*)) * 100,
                    2
                )
            ELSE 0
        END AS reorder_rate,
        COALESCE(
            SUM(total_cents) FILTER (WHERE (metadata->>'isReorder')::BOOLEAN = TRUE),
            0
        )::INTEGER AS total_revenue_cents
    FROM orders
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- HELPER FUNCTION: Get Reorder History
-- ============================================================================

CREATE OR REPLACE FUNCTION get_reorder_history(p_rendition_id UUID)
RETURNS TABLE(
    order_id UUID,
    order_number VARCHAR(50),
    status VARCHAR(50),
    total_cents INTEGER,
    currency_code VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id AS order_id,
        o.order_number,
        o.status,
        o.total_cents,
        o.currency_code,
        o.created_at
    FROM orders o
    WHERE o.rendition_id = p_rendition_id
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN quotes.is_reorder IS 'TRUE if this quote was created from a reorder request';
COMMENT ON COLUMN quotes.original_order_id IS 'Reference to the original order for reorder quotes';
COMMENT ON FUNCTION get_reorder_stats IS 'Get reorder statistics for a user';
COMMENT ON FUNCTION get_reorder_history IS 'Get all orders using a specific rendition';
