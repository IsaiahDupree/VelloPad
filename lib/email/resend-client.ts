/**
 * Resend Email Client
 * Features: GDP-004, GDP-005
 *
 * Wrapper around Resend API that ensures all emails are tagged with:
 * - person_id (for Growth Data Plane linking)
 * - email_message_id (for tracking)
 * - email_type (lifecycle, transactional, campaign)
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY!);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface SendEmailOptions {
  // Required
  personId: string;
  to: string;
  subject: string;
  html: string;

  // Optional
  text?: string;
  from?: string;
  emailType?: 'lifecycle' | 'transactional' | 'campaign';
  campaignId?: string;
  templateKey?: string;
  replyTo?: string;

  // Additional metadata
  metadata?: Record<string, any>;
}

export interface SendEmailResult {
  success: boolean;
  emailMessageId?: string;
  providerMessageId?: string;
  error?: string;
}

/**
 * Send email via Resend with automatic Growth Data Plane tracking
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const {
    personId,
    to,
    subject,
    html,
    text,
    from = 'VelloPad <hello@vellopad.com>',
    emailType = 'lifecycle',
    campaignId,
    templateKey,
    replyTo,
    metadata = {}
  } = options;

  try {
    // Create email_message record first
    const { data: emailMessage, error: dbError } = await supabase
      .from('email_message')
      .insert({
        person_id: personId,
        to_email: to,
        from_email: from,
        subject,
        email_type: emailType,
        campaign_id: campaignId,
        template_key: templateKey,
        provider: 'resend',
        status: 'queued',
        tags: [
          { name: 'person_id', value: personId },
          { name: 'email_type', value: emailType }
        ],
        properties: metadata
      })
      .select('id')
      .single();

    if (dbError || !emailMessage) {
      console.error('[Resend Client] Failed to create email_message:', dbError);
      return {
        success: false,
        error: 'Failed to create email record'
      };
    }

    const emailMessageId = emailMessage.id;

    // Send email via Resend with tags
    const { data: resendData, error: resendError } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      reply_to: replyTo,
      tags: [
        { name: 'person_id', value: personId },
        { name: 'email_message_id', value: emailMessageId },
        { name: 'email_type', value: emailType }
      ]
    });

    if (resendError || !resendData) {
      console.error('[Resend Client] Failed to send email:', resendError);

      // Update email_message with failure
      await supabase
        .from('email_message')
        .update({
          status: 'failed',
          error_message: resendError?.message || 'Unknown error'
        })
        .eq('id', emailMessageId);

      return {
        success: false,
        emailMessageId,
        error: resendError?.message || 'Failed to send email'
      };
    }

    // Update email_message with provider_message_id
    await supabase
      .from('email_message')
      .update({
        provider_message_id: resendData.id,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', emailMessageId);

    // Create unified_event for email sent
    await supabase.from('unified_event').insert({
      person_id: personId,
      event_name: 'email.sent',
      event_source: 'email',
      event_timestamp: new Date().toISOString(),
      properties: {
        email_message_id: emailMessageId,
        email_type: emailType,
        subject,
        template_key: templateKey
      }
    });

    console.log('[Resend Client] Email sent successfully:', {
      emailMessageId,
      providerMessageId: resendData.id
    });

    return {
      success: true,
      emailMessageId,
      providerMessageId: resendData.id
    };
  } catch (error: any) {
    console.error('[Resend Client] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Unexpected error'
    };
  }
}

/**
 * Send templated email using email_templates table
 */
export async function sendTemplatedEmail(
  personId: string,
  templateKey: string,
  variables: Record<string, string>,
  options?: {
    emailType?: 'lifecycle' | 'transactional' | 'campaign';
    campaignId?: string;
  }
): Promise<SendEmailResult> {
  try {
    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('[Resend Client] Template not found:', templateKey);
      return {
        success: false,
        error: `Template not found: ${templateKey}`
      };
    }

    // Fetch person details
    const { data: person, error: personError } = await supabase
      .from('person')
      .select('email, first_name, last_name')
      .eq('id', personId)
      .single();

    if (personError || !person) {
      console.error('[Resend Client] Person not found:', personId);
      return {
        success: false,
        error: 'Person not found'
      };
    }

    // Replace template variables
    let subject = template.subject_line;
    let html = template.html_body;
    let text = template.text_body || '';

    // Add default variables
    const allVariables = {
      first_name: person.first_name || '',
      last_name: person.last_name || '',
      email: person.email,
      ...variables
    };

    // Simple template replacement ({{variable}})
    Object.entries(allVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      html = html.replace(regex, value);
      text = text.replace(regex, value);
    });

    // Send email
    return await sendEmail({
      personId,
      to: person.email,
      subject,
      html,
      text,
      emailType: options?.emailType || template.template_category as any,
      templateKey,
      campaignId: options?.campaignId
    });
  } catch (error: any) {
    console.error('[Resend Client] Error sending templated email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send templated email'
    };
  }
}

/**
 * Get person by email (or create if doesn't exist)
 */
export async function getOrCreatePersonByEmail(
  email: string,
  firstName?: string,
  lastName?: string
): Promise<string | null> {
  try {
    const { data: personId, error } = await supabase.rpc('get_or_create_person', {
      p_email: email,
      p_first_name: firstName || null,
      p_last_name: lastName || null
    });

    if (error) {
      console.error('[Resend Client] Error getting/creating person:', error);
      return null;
    }

    return personId;
  } catch (error) {
    console.error('[Resend Client] Unexpected error:', error);
    return null;
  }
}
