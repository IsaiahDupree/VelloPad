/**
 * Sending Domains API (MT-009)
 * Manage tenant-specific email sending domains
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSendingDomain } from '@/lib/email/sending-domains';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * GET /api/admin/sending-domains
 * List all sending domains
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('sending_domains')
      .select('*, tenants(id, name)')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ domains: data });
  } catch (error) {
    console.error('Error fetching sending domains:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sending domains' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sending-domains
 * Create a new sending domain for a tenant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, subdomain } = body;

    if (!tenant_id || !subdomain) {
      return NextResponse.json(
        { error: 'tenant_id and subdomain are required' },
        { status: 400 }
      );
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format' },
        { status: 400 }
      );
    }

    const domain = await createSendingDomain(tenant_id, subdomain);

    return NextResponse.json({ domain }, { status: 201 });
  } catch (error) {
    console.error('Error creating sending domain:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create sending domain',
      },
      { status: 500 }
    );
  }
}
