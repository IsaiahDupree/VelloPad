-- Sending Domains Table (MT-009)
-- Enables tenant-specific email sending domains with SPF/DKIM/DMARC

CREATE TYPE sending_domain_status AS ENUM ('pending', 'verifying', 'active', 'failed');

CREATE TABLE sending_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  subdomain TEXT NOT NULL,
  status sending_domain_status NOT NULL DEFAULT 'pending',

  -- DKIM configuration
  dkim_selector TEXT NOT NULL DEFAULT 'resend',
  dkim_public_key TEXT NOT NULL DEFAULT '',
  dkim_verified BOOLEAN NOT NULL DEFAULT false,

  -- SPF verification
  spf_verified BOOLEAN NOT NULL DEFAULT false,

  -- DMARC verification
  dmarc_verified BOOLEAN NOT NULL DEFAULT false,

  -- Verification errors
  verification_errors TEXT[] NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT sending_domains_tenant_subdomain_key UNIQUE (tenant_id, subdomain)
);

-- Indexes
CREATE INDEX idx_sending_domains_tenant ON sending_domains(tenant_id);
CREATE INDEX idx_sending_domains_status ON sending_domains(status);
CREATE INDEX idx_sending_domains_verified ON sending_domains(dkim_verified, spf_verified, dmarc_verified);

-- Updated at trigger
CREATE TRIGGER sending_domains_updated_at
  BEFORE UPDATE ON sending_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE sending_domains ENABLE ROW LEVEL SECURITY;

-- Admins can view all sending domains
CREATE POLICY sending_domains_admin_select ON sending_domains
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- Admins can manage sending domains
CREATE POLICY sending_domains_admin_all ON sending_domains
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'owner'
    )
  );

-- Comments
COMMENT ON TABLE sending_domains IS 'Tenant-specific email sending domains with DNS verification (MT-009)';
COMMENT ON COLUMN sending_domains.domain IS 'Full sending domain (e.g., mail.faith.vellopad.com)';
COMMENT ON COLUMN sending_domains.subdomain IS 'Tenant subdomain (e.g., faith)';
COMMENT ON COLUMN sending_domains.dkim_selector IS 'DKIM selector (default: resend)';
COMMENT ON COLUMN sending_domains.dkim_public_key IS 'Public DKIM key from email provider';
