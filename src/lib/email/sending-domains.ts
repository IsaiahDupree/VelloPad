/**
 * Subdomain Sending Domains (MT-009)
 *
 * Configure SPF/DKIM/DMARC for tenant-specific sending domains
 * Example: mail.faith.vellopad.com
 *
 * Dependencies: MT-008 (Tenant Email Branding)
 */

import { createClient } from '@supabase/supabase-js';

export interface SendingDomain {
  id: string;
  tenant_id: string;
  domain: string;
  subdomain: string;
  status: 'pending' | 'verifying' | 'active' | 'failed';
  dkim_selector: string;
  dkim_public_key: string;
  dkim_verified: boolean;
  spf_verified: boolean;
  dmarc_verified: boolean;
  verification_errors: string[];
  created_at: Date;
  verified_at?: Date;
}

export interface DNSRecords {
  spf: {
    type: 'TXT';
    name: string;
    value: string;
    priority?: number;
  };
  dkim: {
    type: 'TXT';
    name: string;
    value: string;
  };
  dmarc: {
    type: 'TXT';
    name: string;
    value: string;
  };
  mx?: {
    type: 'MX';
    name: string;
    value: string;
    priority: number;
  };
}

/**
 * Generate DNS records for a tenant sending domain
 */
export function generateDNSRecords(
  tenantSubdomain: string,
  baseDomain: string = 'vellopad.com',
  dkimSelector: string = 'resend'
): DNSRecords {
  const fullDomain = `mail.${tenantSubdomain}.${baseDomain}`;

  return {
    spf: {
      type: 'TXT',
      name: fullDomain,
      value: 'v=spf1 include:resend.com ~all',
    },
    dkim: {
      type: 'TXT',
      name: `${dkimSelector}._domainkey.${fullDomain}`,
      value: '', // Populated by Resend after domain verification
    },
    dmarc: {
      type: 'TXT',
      name: `_dmarc.${fullDomain}`,
      value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@vellopad.com',
    },
  };
}

/**
 * Verify DNS records are properly configured
 */
export async function verifyDNSRecords(
  domain: string,
  expectedRecords: DNSRecords
): Promise<{ verified: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // SPF Verification
    const spfRecord = await resolveTXT(expectedRecords.spf.name);
    if (!spfRecord.includes('include:resend.com')) {
      errors.push('SPF record not found or incorrect');
    }

    // DKIM Verification (check if key exists)
    const dkimRecord = await resolveTXT(expectedRecords.dkim.name);
    if (!dkimRecord) {
      errors.push('DKIM record not found');
    }

    // DMARC Verification
    const dmarcRecord = await resolveTXT(expectedRecords.dmarc.name);
    if (!dmarcRecord.includes('v=DMARC1')) {
      errors.push('DMARC record not found or incorrect');
    }

    return {
      verified: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      verified: false,
      errors: [error instanceof Error ? error.message : 'DNS verification failed'],
    };
  }
}

/**
 * Resolve TXT records via DNS
 * Note: In production, use a DNS library like 'dns' or call a DNS API
 */
async function resolveTXT(hostname: string): Promise<string> {
  // This is a placeholder - implement actual DNS resolution
  // In Node.js: use dns.promises.resolveTxt
  // In Edge runtime: use a DNS API (Cloudflare DNS API, Google DNS-over-HTTPS)

  if (typeof window === 'undefined') {
    // Server-side: use Node.js dns module
    const dns = await import('dns').then(m => m.promises);
    const records = await dns.resolveTxt(hostname);
    return records.flat().join('');
  } else {
    // Client-side: not applicable (DNS lookups must be server-side)
    throw new Error('DNS resolution must be performed server-side');
  }
}

/**
 * Create a sending domain for a tenant via Resend API
 */
export async function createSendingDomain(
  tenantId: string,
  tenantSubdomain: string
): Promise<SendingDomain> {
  const domain = `mail.${tenantSubdomain}.vellopad.com`;
  const dkimSelector = 'resend';

  // Call Resend API to add domain
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const response = await fetch('https://api.resend.com/domains', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      name: domain,
      region: 'us-east-1', // or 'eu-west-1' for EU tenants
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create sending domain: ${error}`);
  }

  const resendDomain = await response.json();

  // Store in database
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('sending_domains')
    .insert({
      tenant_id: tenantId,
      domain,
      subdomain: tenantSubdomain,
      status: 'pending',
      dkim_selector: dkimSelector,
      dkim_public_key: resendDomain.dkim_public_key || '',
      dkim_verified: false,
      spf_verified: false,
      dmarc_verified: false,
      verification_errors: [],
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to store sending domain: ${error.message}`);
  }

  return data as SendingDomain;
}

/**
 * Check verification status of a sending domain
 */
export async function checkDomainVerification(
  domainId: string
): Promise<SendingDomain> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: domain, error } = await supabase
    .from('sending_domains')
    .select('*')
    .eq('id', domainId)
    .single();

  if (error || !domain) {
    throw new Error('Sending domain not found');
  }

  // Query Resend API for verification status
  const resendApiKey = process.env.RESEND_API_KEY;
  const response = await fetch(`https://api.resend.com/domains/${domain.domain}`, {
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
    },
  });

  if (response.ok) {
    const resendDomain = await response.json();

    // Update verification status
    const { data: updated } = await supabase
      .from('sending_domains')
      .update({
        status: resendDomain.status,
        dkim_verified: resendDomain.records?.dkim?.verified || false,
        spf_verified: resendDomain.records?.spf?.verified || false,
        dmarc_verified: resendDomain.records?.dmarc?.verified || false,
        verified_at: resendDomain.verified_at,
      })
      .eq('id', domainId)
      .select()
      .single();

    return updated as SendingDomain;
  }

  return domain as SendingDomain;
}

/**
 * Get sending domain for a tenant
 */
export async function getTenantSendingDomain(
  tenantId: string
): Promise<SendingDomain | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('sending_domains')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();

  if (error) {
    return null;
  }

  return data as SendingDomain;
}
