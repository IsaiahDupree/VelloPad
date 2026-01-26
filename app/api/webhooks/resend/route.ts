/**
 * Resend Webhook Handler
 * Features: GDP-004, GDP-005
 *
 * Handles email events from Resend:
 * - Verifies Svix webhook signatures
 * - Stores email events in email_message and email_event tables
 * - Maps email tags to person_id
 * - Tracks: delivered, opened, clicked, bounced, complained events
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendWebhookSecret = process.env.RESEND_WEBHOOK_SECRET!;

// Initialize Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Resend event types
type ResendEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.bounced'
  | 'email.complained'
  | 'email.opened'
  | 'email.clicked';

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at: string;
  data: {
    created_at: string;
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    tags?: {
      name: string;
      value: string;
    }[];
    // Event-specific fields
    opened_at?: string;
    clicked_at?: string;
    click?: {
      ipAddress: string;
      link: string;
      timestamp: string;
      userAgent: string;
    };
    bounce?: {
      type: 'hard' | 'soft';
      message: string;
    };
  };
}

/**
 * Extract person_id from email tags
 * Tags should include: { name: 'person_id', value: '<uuid>' }
 */
function extractPersonId(tags?: ResendWebhookPayload['data']['tags']): string | null {
  if (!tags) return null;

  const personTag = tags.find((tag) => tag.name === 'person_id');
  return personTag?.value || null;
}

/**
 * Extract email_message_id from tags
 */
function extractEmailMessageId(tags?: ResendWebhookPayload['data']['tags']): string | null {
  if (!tags) return null;

  const messageTag = tags.find((tag) => tag.name === 'email_message_id');
  return messageTag?.value || null;
}

/**
 * Get or create email_message record
 */
async function getOrCreateEmailMessage(
  payload: ResendWebhookPayload,
  personId: string | null
): Promise<string | null> {
  const { email_id, from, to, subject, tags } = payload.data;

  // Check if we already have a message_id from tags
  const existingMessageId = extractEmailMessageId(tags);
  if (existingMessageId) {
    return existingMessageId;
  }

  // If no person_id, we can't link the email
  if (!personId) {
    console.warn('[Resend Webhook] No person_id found in tags, cannot create email_message');
    return null;
  }

  // Try to find existing email_message by provider_message_id
  const { data: existingMessage } = await supabase
    .from('email_message')
    .select('id')
    .eq('provider_message_id', email_id)
    .single();

  if (existingMessage) {
    return existingMessage.id;
  }

  // Create new email_message
  const { data: newMessage, error } = await supabase
    .from('email_message')
    .insert({
      person_id: personId,
      to_email: to[0], // Resend sends to first recipient
      from_email: from,
      subject,
      email_type: 'lifecycle', // Default, can be overridden via tags
      provider: 'resend',
      provider_message_id: email_id,
      status: 'sent',
      sent_at: payload.created_at,
      tags: tags || []
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Resend Webhook] Error creating email_message:', error);
    return null;
  }

  return newMessage?.id || null;
}

/**
 * Create email_event record
 */
async function createEmailEvent(
  emailMessageId: string,
  personId: string,
  eventType: string,
  payload: ResendWebhookPayload
) {
  const { data, error } = await supabase.from('email_event').insert({
    email_message_id: emailMessageId,
    person_id: personId,
    event_type: eventType,
    event_timestamp: payload.created_at,
    clicked_url: payload.data.click?.link,
    user_agent: payload.data.click?.userAgent,
    provider_event_id: payload.data.email_id,
    raw_event: payload
  });

  if (error) {
    console.error('[Resend Webhook] Error creating email_event:', error);
  }

  return data;
}

/**
 * Update email_message status and timestamps
 */
async function updateEmailMessage(
  emailMessageId: string,
  eventType: ResendEventType,
  payload: ResendWebhookPayload
) {
  const updates: Record<string, any> = {};

  switch (eventType) {
    case 'email.delivered':
      updates.status = 'delivered';
      updates.delivered_at = payload.created_at;
      break;

    case 'email.opened':
      updates.status = 'opened';
      updates.opened_at = payload.data.opened_at || payload.created_at;
      // Increment open count
      const { data: currentMessage } = await supabase
        .from('email_message')
        .select('open_count')
        .eq('id', emailMessageId)
        .single();
      if (currentMessage) {
        updates.open_count = (currentMessage.open_count || 0) + 1;
      }
      break;

    case 'email.clicked':
      updates.status = 'clicked';
      if (!updates.first_clicked_at) {
        updates.first_clicked_at = payload.data.clicked_at || payload.created_at;
      }
      // Increment click count
      const { data: clickedMessage } = await supabase
        .from('email_message')
        .select('click_count')
        .eq('id', emailMessageId)
        .single();
      if (clickedMessage) {
        updates.click_count = (clickedMessage.click_count || 0) + 1;
      }
      break;

    case 'email.bounced':
      updates.status = 'bounced';
      updates.bounced_at = payload.created_at;
      updates.error_message = payload.data.bounce?.message;
      break;

    case 'email.complained':
      updates.status = 'complained';
      updates.complained_at = payload.created_at;
      break;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('email_message')
      .update(updates)
      .eq('id', emailMessageId);

    if (error) {
      console.error('[Resend Webhook] Error updating email_message:', error);
    }
  }
}

/**
 * Create unified_event for email engagement
 */
async function createUnifiedEvent(
  personId: string,
  eventType: ResendEventType,
  payload: ResendWebhookPayload
) {
  // Map Resend event type to unified event name
  const eventNameMap: Record<ResendEventType, string> = {
    'email.sent': 'email.sent',
    'email.delivered': 'email.delivered',
    'email.delivery_delayed': 'email.delayed',
    'email.bounced': 'email.bounced',
    'email.complained': 'email.complained',
    'email.opened': 'email.opened',
    'email.clicked': 'email.clicked'
  };

  const eventName = eventNameMap[eventType] || eventType;

  const { error } = await supabase.from('unified_event').insert({
    person_id: personId,
    event_name: eventName,
    event_source: 'email',
    event_timestamp: payload.created_at,
    properties: {
      email_id: payload.data.email_id,
      subject: payload.data.subject,
      from: payload.data.from,
      to: payload.data.to,
      clicked_url: payload.data.click?.link,
      bounce_type: payload.data.bounce?.type
    },
    raw_event: payload
  });

  if (error) {
    console.error('[Resend Webhook] Error creating unified_event:', error);
  }
}

/**
 * Main webhook handler
 */
export async function POST(req: NextRequest) {
  try {
    // Verify Svix signature
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('[Resend Webhook] Missing Svix headers');
      return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 });
    }

    // Get raw body
    const body = await req.text();

    // Verify signature
    const wh = new Webhook(resendWebhookSecret);
    let payload: ResendWebhookPayload;

    try {
      payload = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature
      }) as ResendWebhookPayload;
    } catch (err) {
      console.error('[Resend Webhook] Signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log('[Resend Webhook] Received event:', payload.type);

    // Extract person_id from tags
    const personId = extractPersonId(payload.data.tags);

    if (!personId) {
      console.warn(
        '[Resend Webhook] No person_id in tags, skipping event:',
        payload.data.email_id
      );
      return NextResponse.json({ received: true, skipped: true });
    }

    // Get or create email_message
    const emailMessageId = await getOrCreateEmailMessage(payload, personId);

    if (!emailMessageId) {
      console.error('[Resend Webhook] Failed to get/create email_message');
      return NextResponse.json({ error: 'Failed to process email' }, { status: 500 });
    }

    // Create email_event
    await createEmailEvent(emailMessageId, personId, payload.type, payload);

    // Update email_message with event data
    await updateEmailMessage(emailMessageId, payload.type, payload);

    // Create unified_event for analytics
    await createUnifiedEvent(personId, payload.type, payload);

    console.log('[Resend Webhook] Successfully processed event:', payload.type);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Resend Webhook] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also support GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'Resend webhook endpoint is active' });
}
