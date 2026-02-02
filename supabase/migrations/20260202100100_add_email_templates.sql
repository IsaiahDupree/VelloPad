-- Email Templates Table (MT-010)
-- Tenant-aware email templates for lifecycle events

CREATE TYPE lifecycle_event_type AS ENUM (
  'signup_welcome',
  'activation_nudge',
  'first_chapter_prompt',
  'progress_milestone',
  'stalled_user',
  'proof_copy_push',
  'order_confirmed',
  'order_shipped',
  'order_delivered',
  'marketing_daily_task',
  'marketing_weekly_plan'
);

CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lifecycle_event lifecycle_event_type NOT NULL,

  -- Template content
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  -- One template per tenant per event (or one default per event if tenant_id is null)
  CONSTRAINT email_templates_tenant_event_key UNIQUE (tenant_id, lifecycle_event)
);

-- Indexes
CREATE INDEX idx_email_templates_tenant ON email_templates(tenant_id);
CREATE INDEX idx_email_templates_event ON email_templates(lifecycle_event);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);

-- Updated at trigger
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can view all templates
CREATE POLICY email_templates_admin_select ON email_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- Admins can manage templates
CREATE POLICY email_templates_admin_all ON email_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'owner'
    )
  );

-- Insert default templates
INSERT INTO email_templates (tenant_id, lifecycle_event, subject_template, body_template, variables) VALUES

-- Welcome email
(NULL, 'signup_welcome',
 'Welcome to {{tenant_name}}! 🎉',
 '<p>Hi {{user_name}},</p>
  <p>Welcome to {{tenant_name}}! We''re excited to help you create your book.</p>
  <p>Here''s how to get started:</p>
  <ol>
    <li>Choose a template that fits your book''s style</li>
    <li>Write your first chapter (even just 10 minutes!)</li>
    <li>Use our AI sidekick for prompts and guidance</li>
  </ol>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{app_url}}/books/new" style="background: {{brand_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Your Book</a>
  </p>
  <p>Questions? Just reply to this email—we''re here to help!</p>
  <p>Best,<br>The {{tenant_name}} Team</p>',
 ARRAY['user_name', 'tenant_name', 'app_url', 'brand_color']),

-- Activation nudge
(NULL, 'activation_nudge',
 '{{user_name}}, your book is waiting ✍️',
 '<p>Hi {{user_name}},</p>
  <p>We noticed you haven''t started your book yet. No pressure—but we wanted to share a quick tip:</p>
  <p><strong>The hardest part is starting.</strong> Just write for 10 minutes. Don''t worry about perfection. Get the ideas out first, polish later.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{app_url}}/books" style="background: {{brand_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Write Your First Chapter</a>
  </p>
  <p>We''re rooting for you!</p>
  <p>Best,<br>The {{tenant_name}} Team</p>',
 ARRAY['user_name', 'tenant_name', 'app_url', 'brand_color']),

-- Proof copy push
(NULL, 'proof_copy_push',
 '🎉 Your book is ready to print!',
 '<p>Hi {{user_name}},</p>
  <p>Congratulations! Your book "{{book_title}}" is print-ready. 📚</p>
  <p>We <strong>highly recommend</strong> ordering a proof copy before printing bulk copies. Here''s why:</p>
  <ul>
    <li>See exactly how your book looks and feels in print</li>
    <li>Catch any formatting issues before bulk orders</li>
    <li>Experience the quality firsthand</li>
  </ul>
  <p>Proof copies start at just ${{proof_cost}}.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{order_url}}" style="background: {{brand_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Order Your Proof Copy</a>
  </p>
  <p>Excited to see your book in print!</p>
  <p>Best,<br>The {{tenant_name}} Team</p>',
 ARRAY['user_name', 'tenant_name', 'book_title', 'proof_cost', 'order_url', 'brand_color']),

-- Order shipped
(NULL, 'order_shipped',
 '📦 Your order is on the way!',
 '<p>Hi {{user_name}},</p>
  <p>Great news! Your order #{{order_number}} has shipped.</p>
  <p><strong>Tracking Details:</strong></p>
  <ul>
    <li><strong>Carrier:</strong> {{carrier}}</li>
    <li><strong>Tracking Number:</strong> {{tracking_number}}</li>
    <li><strong>Estimated Delivery:</strong> {{estimated_delivery}}</li>
  </ul>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{tracking_url}}" style="background: {{brand_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Track Your Package</a>
  </p>
  <p>We can''t wait for you to hold your book!</p>
  <p>Best,<br>The {{tenant_name}} Team</p>',
 ARRAY['user_name', 'tenant_name', 'order_number', 'carrier', 'tracking_number', 'estimated_delivery', 'tracking_url', 'brand_color']);

-- Comments
COMMENT ON TABLE email_templates IS 'Tenant-aware email templates for lifecycle events (MT-010)';
COMMENT ON COLUMN email_templates.tenant_id IS 'Tenant ID (null = default template)';
COMMENT ON COLUMN email_templates.subject_template IS 'Email subject with template variables';
COMMENT ON COLUMN email_templates.body_template IS 'Email body HTML with template variables';
COMMENT ON COLUMN email_templates.variables IS 'List of required template variables';
