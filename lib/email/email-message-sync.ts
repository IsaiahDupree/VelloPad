/**
 * Email Message Synchronization
 *
 * Syncs email data between email_sends (legacy) and email_message (GDP)
 * This ensures compatibility between existing lifecycle emails and new Growth Data Plane
 */

import { createClient } from '@/lib/supabase/server';

export interface EmailMessageSyncParams {
  emailSendId: string;
  personId?: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  emailType: string;
  templateKey?: string;
  campaignId?: string;
  provider: string;
  providerMessageId?: string;
  status: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Sync email_sends record to email_message table
 * Creates a corresponding record in the Growth Data Plane
 */
export async function syncEmailToGDP(
  params: EmailMessageSyncParams
): Promise<string | null> {
  try {
    const supabase = await createClient();

    // Check if person exists, if not create or look up by email
    let personId = params.personId;

    if (!personId) {
      // Try to find person by email
      const { data: existingPerson } = await supabase
        .from('person')
        .select('id')
        .eq('email', params.toEmail)
        .single();

      if (existingPerson) {
        personId = existingPerson.id;
      } else {
        // Create new person
        const { data: newPerson, error: personError } = await supabase
          .from('person')
          .insert({
            email: params.toEmail,
            lifecycle_stage: 'lead',
          })
          .select('id')
          .single();

        if (!personError && newPerson) {
          personId = newPerson.id;
        }
      }
    }

    if (!personId) {
      console.warn('Could not resolve person_id for email:', params.toEmail);
      return null;
    }

    // Create email_message record
    const { data: emailMessage, error } = await supabase
      .from('email_message')
      .insert({
        person_id: personId,
        to_email: params.toEmail,
        from_email: params.fromEmail,
        subject: params.subject,
        email_type: params.emailType,
        campaign_id: params.campaignId,
        template_key: params.templateKey,
        provider: params.provider,
        provider_message_id: params.providerMessageId,
        status: params.status,
        tags: params.tags || [],
        properties: {
          ...(params.metadata || {}),
          email_send_id: params.emailSendId, // Link to legacy table
        },
        ...(params.status === 'sent' && { sent_at: new Date().toISOString() }),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to sync email to GDP:', error);
      return null;
    }

    // Store email_message_id in email_sends metadata for reverse lookup
    await supabase
      .from('email_sends')
      .update({
        metadata: {
          email_message_id: emailMessage.id,
        },
      })
      .eq('id', params.emailSendId);

    return emailMessage.id;
  } catch (error) {
    console.error('Error syncing email to GDP:', error);
    return null;
  }
}

/**
 * Get person_id from email address
 * Creates person if doesn't exist
 */
export async function getOrCreatePersonByEmail(email: string): Promise<string | null> {
  try {
    const supabase = await createClient();

    // Try to find existing person
    const { data: existingPerson } = await supabase
      .from('person')
      .select('id')
      .eq('email', email)
      .single();

    if (existingPerson) {
      return existingPerson.id;
    }

    // Create new person
    const { data: newPerson, error } = await supabase
      .from('person')
      .insert({
        email,
        lifecycle_stage: 'lead',
      })
      .select('id')
      .single();

    if (error || !newPerson) {
      console.error('Failed to create person:', error);
      return null;
    }

    return newPerson.id;
  } catch (error) {
    console.error('Error getting or creating person:', error);
    return null;
  }
}

/**
 * Get email_message_id from email_send_id
 */
export async function getEmailMessageId(emailSendId: string): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data: emailSend } = await supabase
      .from('email_sends')
      .select('metadata')
      .eq('id', emailSendId)
      .single();

    return emailSend?.metadata?.email_message_id || null;
  } catch (error) {
    console.error('Error getting email_message_id:', error);
    return null;
  }
}
