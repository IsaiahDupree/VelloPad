/**
 * Tenant-Aware Email Sequences (MT-010)
 *
 * Email templates selected by (tenant_id, lifecycle_event)
 * Supports tenant-specific branding, tone, and content
 *
 * Dependencies: MT-008 (Tenant Email Branding), BS-702 (Lifecycle Emails)
 */

import { getTenantBranding } from './tenant-branding';
import { getTenantSendingDomain } from './sending-domains';
import { createClient } from '@supabase/supabase-js';

export type LifecycleEvent =
  | 'signup_welcome'
  | 'activation_nudge'
  | 'first_chapter_prompt'
  | 'progress_milestone'
  | 'stalled_user'
  | 'proof_copy_push'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'marketing_daily_task'
  | 'marketing_weekly_plan';

export interface EmailTemplate {
  id: string;
  tenant_id: string | null; // null = default template
  lifecycle_event: LifecycleEvent;
  subject_template: string;
  body_template: string;
  variables: string[]; // List of required template variables
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EmailContext {
  user_id: string;
  tenant_id: string;
  user_email: string;
  user_name: string;
  [key: string]: any; // Additional context variables
}

/**
 * Get email template for a specific tenant and lifecycle event
 * Falls back to default template if tenant-specific template doesn't exist
 */
export async function getEmailTemplate(
  tenantId: string,
  lifecycleEvent: LifecycleEvent
): Promise<EmailTemplate | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Try tenant-specific template first
  let { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('lifecycle_event', lifecycleEvent)
    .eq('is_active', true)
    .single();

  // Fall back to default template
  if (error || !data) {
    const { data: defaultData } = await supabase
      .from('email_templates')
      .select('*')
      .is('tenant_id', null)
      .eq('lifecycle_event', lifecycleEvent)
      .eq('is_active', true)
      .single();

    data = defaultData;
  }

  return data as EmailTemplate | null;
}

/**
 * Render email template with context variables
 */
export function renderTemplate(template: string, context: Record<string, any>): string {
  let rendered = template;

  // Simple template variable replacement: {{variable_name}}
  Object.entries(context).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, String(value));
  });

  return rendered;
}

/**
 * Send a tenant-aware lifecycle email
 */
export async function sendLifecycleEmail(
  lifecycleEvent: LifecycleEvent,
  context: EmailContext
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    const { tenant_id, user_email, user_name } = context;

    // Get tenant branding
    const branding = await getTenantBranding(tenant_id);
    if (!branding) {
      return { success: false, error: 'Tenant branding not found' };
    }

    // Get email template
    const template = await getEmailTemplate(tenant_id, lifecycleEvent);
    if (!template) {
      return { success: false, error: 'Email template not found' };
    }

    // Get sending domain (if configured)
    const sendingDomain = await getTenantSendingDomain(tenant_id);
    const fromEmail = sendingDomain?.domain
      ? `${branding.from_name} <hello@${sendingDomain.domain}>`
      : `${branding.from_name} <${branding.from_email}>`;

    // Render subject and body
    const renderedContext = {
      ...context,
      user_name,
      tenant_name: branding.tenant_name,
      brand_color: branding.colors?.primary || '#2F2B4A',
    };

    const subject = renderTemplate(template.subject_template, renderedContext);
    const body = renderTemplate(template.body_template, renderedContext);

    // Apply tenant email wrapper (header/footer)
    const html = applyEmailWrapper(body, branding);

    // Send via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: user_email,
        subject,
        html,
        tags: [
          { name: 'lifecycle_event', value: lifecycleEvent },
          { name: 'tenant_id', value: tenant_id },
          { name: 'user_id', value: context.user_id },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Resend API error: ${error}` };
    }

    const result = await response.json();

    // Log email send
    await logEmailSend(tenant_id, context.user_id, lifecycleEvent, result.id);

    return { success: true, message_id: result.id };
  } catch (error) {
    console.error('Error sending lifecycle email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Apply tenant-specific email wrapper (header/footer)
 */
function applyEmailWrapper(
  bodyHtml: string,
  branding: {
    tenant_name: string;
    colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    footer_text?: string;
  }
): string {
  const primaryColor = branding.colors?.primary || '#2F2B4A';
  const logoHtml = branding.logo_url
    ? `<img src="${branding.logo_url}" alt="${branding.tenant_name}" style="max-width: 150px; height: auto;" />`
    : `<h1 style="color: ${primaryColor}; font-size: 24px; margin: 0;">${branding.tenant_name}</h1>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${branding.tenant_name}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f6f1e7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 2px solid ${primaryColor};">
              ${logoHtml}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb;">
              ${branding.footer_text || `© ${new Date().getFullYear()} ${branding.tenant_name}. All rights reserved.`}
              <br><br>
              <a href="{{unsubscribe_url}}" style="color: #666; text-decoration: underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Log email send to database
 */
async function logEmailSend(
  tenantId: string,
  userId: string,
  lifecycleEvent: LifecycleEvent,
  messageId: string
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from('email_message').insert({
    person_id: userId,
    tenant_id: tenantId,
    lifecycle_event: lifecycleEvent,
    provider_message_id: messageId,
    status: 'sent',
    sent_at: new Date().toISOString(),
  });
}

/**
 * Create a new email template
 */
export async function createEmailTemplate(
  template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<EmailTemplate> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('email_templates')
    .insert(template)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create email template: ${error.message}`);
  }

  return data as EmailTemplate;
}

/**
 * Update an email template
 */
export async function updateEmailTemplate(
  templateId: string,
  updates: Partial<EmailTemplate>
): Promise<EmailTemplate> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update email template: ${error.message}`);
  }

  return data as EmailTemplate;
}
