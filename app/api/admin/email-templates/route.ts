/**
 * Email Templates API (MT-010)
 * Manage tenant-aware email templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createEmailTemplate } from '@/lib/email/tenant-sequences';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * GET /api/admin/email-templates
 * List all email templates (default + tenant-specific)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    const lifecycleEvent = searchParams.get('lifecycle_event');

    let query = supabase
      .from('email_templates')
      .select('*, tenants(id, name)')
      .order('lifecycle_event', { ascending: true })
      .order('tenant_id', { ascending: true });

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    if (lifecycleEvent) {
      query = query.eq('lifecycle_event', lifecycleEvent);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: data });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/email-templates
 * Create a new email template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenant_id,
      lifecycle_event,
      subject_template,
      body_template,
      variables,
      is_active = true,
    } = body;

    if (!lifecycle_event || !subject_template || !body_template) {
      return NextResponse.json(
        {
          error: 'lifecycle_event, subject_template, and body_template are required',
        },
        { status: 400 }
      );
    }

    const template = await createEmailTemplate({
      tenant_id: tenant_id || null,
      lifecycle_event,
      subject_template,
      body_template,
      variables: variables || [],
      is_active,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating email template:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to create email template',
      },
      { status: 500 }
    );
  }
}
