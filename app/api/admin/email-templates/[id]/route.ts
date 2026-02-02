/**
 * Email Template Management API (MT-010)
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateEmailTemplate } from '@/lib/email/tenant-sequences';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * GET /api/admin/email-templates/[id]
 * Get a specific email template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('email_templates')
      .select('*, tenants(id, name)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error('Error fetching email template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email template' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/email-templates/[id]
 * Update an email template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const template = await updateEmailTemplate(id, body);

    return NextResponse.json({ template }, { status: 200 });
  } catch (error) {
    console.error('Error updating email template:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update email template',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/email-templates/[id]
 * Delete an email template (tenant-specific only, not defaults)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get template to check if it's a default
    const { data: template } = await supabase
      .from('email_templates')
      .select('tenant_id')
      .eq('id', id)
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Prevent deletion of default templates
    if (template.tenant_id === null) {
      return NextResponse.json(
        { error: 'Cannot delete default templates' },
        { status: 403 }
      );
    }

    // Delete template
    const { error } = await supabase.from('email_templates').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting email template:', error);
    return NextResponse.json(
      { error: 'Failed to delete email template' },
      { status: 500 }
    );
  }
}
