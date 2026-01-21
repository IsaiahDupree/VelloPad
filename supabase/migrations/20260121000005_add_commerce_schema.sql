-- ============================================================================
-- VelloPad Commerce Schema
-- Feature: DB-004
-- Migration: 20260121000005
-- ============================================================================

-- This migration creates tables for:
-- 1. Orders (print-on-demand orders)
-- 2. Order items (line items in an order)
-- 3. Quotes (shipping and pricing quotes)
-- 4. Shipments (tracking and delivery info)
-- 5. Order status updates (audit trail)
-- 6. Payment transactions (Stripe integration)

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE SET NULL,
    rendition_id UUID REFERENCES renditions(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

    -- Order details
    order_number VARCHAR(50) UNIQUE NOT NULL, -- Human-readable order number
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled, refunded, issue

    -- Print provider info
    provider VARCHAR(50) NOT NULL, -- prodigi, gelato, lulu, peecho
    provider_order_id VARCHAR(255), -- Provider's order ID
    provider_status VARCHAR(100), -- Provider's raw status

    -- Customer info
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,

    -- Shipping address
    shipping_address_line1 VARCHAR(255) NOT NULL,
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100) NOT NULL,
    shipping_state VARCHAR(100),
    shipping_postal_code VARCHAR(50) NOT NULL,
    shipping_country_code VARCHAR(10) NOT NULL,

    -- Pricing
    subtotal_cents INTEGER NOT NULL,
    shipping_cents INTEGER NOT NULL,
    tax_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL,
    currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',

    -- Shipping method
    shipping_method VARCHAR(50) NOT NULL, -- budget, standard, express
    estimated_delivery_date TIMESTAMP WITH TIME ZONE,

    -- Tracking
    tracking_number VARCHAR(255),
    tracking_url TEXT,

    -- Timestamps
    ordered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_workspace_id ON orders(workspace_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_book_id ON orders(book_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_provider ON orders(provider);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ============================================================================
-- ORDER ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE SET NULL,
    rendition_id UUID REFERENCES renditions(id) ON DELETE SET NULL,

    -- Product details
    product_type VARCHAR(50) NOT NULL, -- book, photo_book, notebook, etc.
    sku VARCHAR(100),

    -- Book specifications
    title VARCHAR(500) NOT NULL,
    trim_size VARCHAR(20),
    binding VARCHAR(50),
    page_count INTEGER,
    paper_type VARCHAR(50),
    cover_finish VARCHAR(50),

    -- Quantity and pricing
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_cents INTEGER NOT NULL,
    total_price_cents INTEGER NOT NULL,

    -- PDF URLs (stored in object storage)
    interior_pdf_url TEXT,
    cover_pdf_url TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_book_id ON order_items(book_id);

-- ============================================================================
-- QUOTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,

    -- Quote details
    provider VARCHAR(50) NOT NULL,
    provider_quote_id VARCHAR(255), -- Provider's quote ID

    -- Shipping address
    shipping_country_code VARCHAR(10) NOT NULL,
    shipping_postal_code VARCHAR(50),

    -- Product specs
    quantity INTEGER NOT NULL DEFAULT 1,
    product_type VARCHAR(50) NOT NULL,
    trim_size VARCHAR(20),
    binding VARCHAR(50),
    page_count INTEGER,

    -- Pricing breakdown
    item_cost_cents INTEGER NOT NULL,
    shipping_cost_cents INTEGER NOT NULL,
    tax_cents INTEGER DEFAULT 0,
    total_cost_cents INTEGER NOT NULL,
    currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',

    -- Shipping options
    shipping_method VARCHAR(50) NOT NULL,
    estimated_delivery_days INTEGER,

    -- Quote validity
    expires_at TIMESTAMP WITH TIME ZONE,
    is_valid BOOLEAN DEFAULT TRUE,

    -- Metadata
    provider_response JSONB,
    metadata JSONB DEFAULT '{}',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quotes_workspace_id ON quotes(workspace_id);
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_book_id ON quotes(book_id);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);

-- ============================================================================
-- SHIPMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,

    -- Carrier info
    carrier_name VARCHAR(100),
    carrier_service VARCHAR(100),

    -- Tracking
    tracking_number VARCHAR(255),
    tracking_url TEXT,

    -- Delivery
    shipped_at TIMESTAMP WITH TIME ZONE,
    in_transit_at TIMESTAMP WITH TIME ZONE,
    out_for_delivery_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    attempted_delivery_at TIMESTAMP WITH TIME ZONE,

    -- Location tracking
    current_location VARCHAR(255),

    -- Metadata
    tracking_events JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);

-- ============================================================================
-- ORDER STATUS UPDATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    -- Status info
    status VARCHAR(50) NOT NULL,
    message TEXT,

    -- Source of update
    source VARCHAR(50) NOT NULL DEFAULT 'system', -- system, webhook, polling, manual

    -- Provider data
    provider_data JSONB,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_status_updates_order_id ON order_status_updates(order_id);
CREATE INDEX idx_order_status_updates_created_at ON order_status_updates(created_at DESC);

-- ============================================================================
-- PAYMENT TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

    -- Stripe info
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),

    -- Transaction details
    status VARCHAR(50) NOT NULL, -- pending, succeeded, failed, cancelled, refunded
    amount_cents INTEGER NOT NULL,
    currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',

    -- Refund info
    refund_amount_cents INTEGER DEFAULT 0,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_reason TEXT,

    -- Payment method
    payment_method_type VARCHAR(50), -- card, bank_transfer, etc.
    payment_method_last4 VARCHAR(4),
    payment_method_brand VARCHAR(50),

    -- Error handling
    failure_code VARCHAR(50),
    failure_message TEXT,

    -- Metadata
    stripe_metadata JSONB,
    metadata JSONB DEFAULT '{}',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_transactions_workspace_id ON payment_transactions(workspace_id);
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_stripe_payment_intent_id ON payment_transactions(stripe_payment_intent_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Users can view orders in their workspaces"
    ON orders FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create orders in their workspaces"
    ON orders FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update orders in their workspaces"
    ON orders FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- Order items policies
CREATE POLICY "Users can view order items in their workspaces"
    ON order_items FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- Quotes policies
CREATE POLICY "Users can view quotes in their workspaces"
    ON quotes FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create quotes in their workspaces"
    ON quotes FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- Shipments policies
CREATE POLICY "Users can view shipments for their orders"
    ON shipments FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- Order status updates policies
CREATE POLICY "Users can view status updates for their orders"
    ON order_status_updates FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- Payment transactions policies
CREATE POLICY "Users can view payment transactions in their workspaces"
    ON payment_transactions FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update orders.updated_at on change
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Update shipments.updated_at on change
CREATE TRIGGER update_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Update payment_transactions.updated_at on change
CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    new_number VARCHAR(50);
    exists BOOLEAN;
BEGIN
    LOOP
        -- Format: VLP-YYYYMMDD-XXXX
        new_number := 'VLP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

        -- Check if exists
        SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = new_number) INTO exists;

        IF NOT exists THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Get order statistics for workspace
CREATE OR REPLACE FUNCTION get_workspace_order_stats(p_workspace_id UUID)
RETURNS TABLE (
    total_orders INTEGER,
    total_revenue_cents BIGINT,
    pending_orders INTEGER,
    completed_orders INTEGER,
    average_order_value_cents BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER AS total_orders,
        COALESCE(SUM(total_cents), 0)::BIGINT AS total_revenue_cents,
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing'))::INTEGER AS pending_orders,
        COUNT(*) FILTER (WHERE status = 'delivered')::INTEGER AS completed_orders,
        COALESCE(AVG(total_cents), 0)::BIGINT AS average_order_value_cents
    FROM orders
    WHERE workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE orders IS 'Print-on-demand orders with customer and shipping info';
COMMENT ON TABLE order_items IS 'Line items in an order (books, quantities, pricing)';
COMMENT ON TABLE quotes IS 'Shipping and pricing quotes from print providers';
COMMENT ON TABLE shipments IS 'Tracking and delivery information for orders';
COMMENT ON TABLE order_status_updates IS 'Audit trail of order status changes';
COMMENT ON TABLE payment_transactions IS 'Stripe payment records and refunds';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
