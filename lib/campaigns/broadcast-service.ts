/**
 * Campaign Broadcast Service (BS-703)
 *
 * Core service layer for creating, managing, and sending broadcast email campaigns.
 * Integrates with Growth Data Plane segments and email infrastructure.
 */

import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/resend-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface BroadcastCampaign {
  id?: string;
  workspace_id: string;
  name: string;
  description?: string;
  email_subject: string;
  email_content: string;
  preview_text?: string;
  segment_ids: string[];
  status?: 'draft' | 'sending' | 'sent' | 'failed';
  campaign_type?: 'one_time';
  sent_at?: string;
  send_count?: number;
  delivered_count?: number;
  opened_count?: number;
  clicked_count?: number;
}

export interface AudiencePreview {
  total_count: number;
  segment_breakdown: {
    segment_id: string;
    segment_name: string;
    member_count: number;
  }[];
  sample_users: {
    person_id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  }[];
}

export interface CampaignStats {
  campaign_id: string;
  total_sent: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  failed_count: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
}

/**
 * Create a new broadcast campaign
 */
export async function createBroadcastCampaign(
  params: BroadcastCampaign
): Promise<{ campaign: any; error: any }> {
  try {
    // Validate required fields
    if (!params.workspace_id || !params.name || !params.email_subject || !params.email_content) {
      return {
        campaign: null,
        error: { message: 'Missing required fields' },
      };
    }

    if (!params.segment_ids || params.segment_ids.length === 0) {
      return {
        campaign: null,
        error: { message: 'At least one segment must be selected' },
      };
    }

    // Create campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        workspace_id: params.workspace_id,
        name: params.name,
        description: params.description || '',
        campaign_type: 'one_time',
        status: 'draft',
        email_subject: params.email_subject,
        email_content: params.email_content,
        preview_text: params.preview_text,
        segment_ids: params.segment_ids,
      })
      .select()
      .single();

    if (error) {
      return { campaign: null, error };
    }

    // Create campaign_segments links
    const segmentLinks = params.segment_ids.map((segmentId) => ({
      campaign_id: campaign.id,
      segment_id: segmentId,
    }));

    const { error: linkError } = await supabase
      .from('campaign_segments')
      .insert(segmentLinks);

    if (linkError) {
      // Rollback campaign creation
      await supabase.from('campaigns').delete().eq('id', campaign.id);
      return { campaign: null, error: linkError };
    }

    return { campaign, error: null };
  } catch (error) {
    return { campaign: null, error };
  }
}

/**
 * Update a draft campaign
 */
export async function updateBroadcastCampaign(
  campaignId: string,
  updates: Partial<BroadcastCampaign>
): Promise<{ campaign: any; error: any }> {
  try {
    // Verify campaign is still in draft status
    const { data: existing } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (!existing || existing.status !== 'draft') {
      return {
        campaign: null,
        error: { message: 'Can only update draft campaigns' },
      };
    }

    // Update campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .update({
        name: updates.name,
        description: updates.description,
        email_subject: updates.email_subject,
        email_content: updates.email_content,
        preview_text: updates.preview_text,
        segment_ids: updates.segment_ids,
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      return { campaign: null, error };
    }

    // Update campaign_segments if segment_ids changed
    if (updates.segment_ids) {
      // Delete old links
      await supabase.from('campaign_segments').delete().eq('campaign_id', campaignId);

      // Create new links
      const segmentLinks = updates.segment_ids.map((segmentId) => ({
        campaign_id: campaignId,
        segment_id: segmentId,
      }));

      await supabase.from('campaign_segments').insert(segmentLinks);
    }

    return { campaign, error: null };
  } catch (error) {
    return { campaign: null, error };
  }
}

/**
 * Delete a draft campaign
 */
export async function deleteBroadcastCampaign(
  campaignId: string
): Promise<{ success: boolean; error: any }> {
  try {
    // Verify campaign is in draft status
    const { data: existing } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (!existing || existing.status !== 'draft') {
      return {
        success: false,
        error: { message: 'Can only delete draft campaigns' },
      };
    }

    // Delete campaign (cascade will delete campaign_segments)
    const { error } = await supabase.from('campaigns').delete().eq('id', campaignId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Get audience preview for selected segments
 */
export async function getCampaignAudiencePreview(
  workspaceId: string,
  segmentIds: string[]
): Promise<{ preview: AudiencePreview | null; error: any }> {
  try {
    if (!segmentIds || segmentIds.length === 0) {
      return {
        preview: {
          total_count: 0,
          segment_breakdown: [],
          sample_users: [],
        },
        error: null,
      };
    }

    // Get unique person IDs across all segments (deduplicated)
    const { data: memberships, error: membershipError } = await supabase
      .from('segment_membership')
      .select('person_id, segment_id, person(email, first_name, last_name)')
      .in('segment_id', segmentIds)
      .is('exited_at', null);

    if (membershipError) {
      return { preview: null, error: membershipError };
    }

    // Deduplicate person IDs
    const uniquePersonIds = [...new Set(memberships?.map((m) => m.person_id) || [])];

    // Get segment breakdown
    const { data: segments, error: segmentError } = await supabase
      .from('segment')
      .select('id, name')
      .in('id', segmentIds);

    if (segmentError) {
      return { preview: null, error: segmentError };
    }

    const segmentBreakdown = segments?.map((segment) => {
      const memberCount =
        memberships?.filter(
          (m) => m.segment_id === segment.id && uniquePersonIds.includes(m.person_id)
        ).length || 0;

      return {
        segment_id: segment.id,
        segment_name: segment.name,
        member_count: memberCount,
      };
    }) || [];

    // Get sample users (first 10 unique)
    const sampleUsers = uniquePersonIds.slice(0, 10).map((personId) => {
      const membership = memberships?.find((m) => m.person_id === personId);
      const person = membership?.person as any;

      return {
        person_id: personId,
        email: person?.email || '',
        first_name: person?.first_name,
        last_name: person?.last_name,
      };
    });

    return {
      preview: {
        total_count: uniquePersonIds.length,
        segment_breakdown: segmentBreakdown,
        sample_users: sampleUsers,
      },
      error: null,
    };
  } catch (error) {
    return { preview: null, error };
  }
}

/**
 * Render email template with variables
 */
function renderTemplate(template: string, person: any): string {
  let rendered = template;

  // Replace template variables
  rendered = rendered.replace(/\{\{first_name\}\}/g, person.first_name || '');
  rendered = rendered.replace(/\{\{last_name\}\}/g, person.last_name || '');
  rendered = rendered.replace(/\{\{email\}\}/g, person.email || '');
  rendered = rendered.replace(/\{\{book_title\}\}/g, person.book_title || '');

  return rendered;
}

/**
 * Send a broadcast campaign to all targeted segments
 */
export async function sendBroadcastCampaign(
  campaignId: string
): Promise<{ success: boolean; sent_count: number; error: any }> {
  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return { success: false, sent_count: 0, error: campaignError || 'Campaign not found' };
    }

    // Verify campaign is in draft status
    if (campaign.status !== 'draft') {
      return {
        success: false,
        sent_count: 0,
        error: { message: 'Campaign already sent or in progress' },
      };
    }

    // Validate campaign has content
    if (!campaign.email_subject || !campaign.email_content) {
      return {
        success: false,
        sent_count: 0,
        error: { message: 'Campaign missing subject or content' },
      };
    }

    // Get target audience (deduplicated)
    const { data: memberships, error: membershipError } = await supabase
      .from('segment_membership')
      .select('person_id, person(id, email, first_name, last_name)')
      .in('segment_id', campaign.segment_ids)
      .is('exited_at', null);

    if (membershipError) {
      return { success: false, sent_count: 0, error: membershipError };
    }

    // Deduplicate persons
    const uniquePersons = Array.from(
      new Map(memberships?.map((m: any) => [m.person_id, m.person]) || []).values()
    ) as any[];

    if (uniquePersons.length === 0) {
      return {
        success: false,
        sent_count: 0,
        error: { message: 'No recipients in selected segments' },
      };
    }

    // Update campaign status to sending
    await supabase
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);

    let sentCount = 0;
    const errors: any[] = [];

    // Send emails in batches
    const batchSize = 50;
    for (let i = 0; i < uniquePersons.length; i += batchSize) {
      const batch = uniquePersons.slice(i, i + batchSize);

      for (const person of batch) {
        try {
          // Check if already sent (deduplication)
          const { data: existingSend } = await supabase
            .from('email_sends')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('person_id', person.id)
            .single();

          if (existingSend) {
            continue; // Skip if already sent
          }

          // Create email_sends record first
          const { data: emailSend, error: sendError } = await supabase
            .from('email_sends')
            .insert({
              campaign_id: campaignId,
              person_id: person.id,
              status: 'pending',
            })
            .select()
            .single();

          if (sendError) {
            errors.push({ person: person.email, error: sendError });
            continue;
          }

          // Render email with template variables
          const subject = renderTemplate(campaign.email_subject, person);
          const content = renderTemplate(campaign.email_content, person);

          // Send email via Resend
          const emailResult = await sendEmail({
            personId: person.id,
            to: person.email,
            subject: subject,
            html: content,
            emailType: 'campaign',
            campaignId: campaignId,
          });

          if (emailResult.success) {
            // Update email_sends record
            await supabase
              .from('email_sends')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                email_message_id: emailResult.emailMessageId,
              })
              .eq('id', emailSend.id);

            sentCount++;
          } else {
            // Mark as failed
            await supabase
              .from('email_sends')
              .update({
                status: 'failed',
                failed_at: new Date().toISOString(),
                error_message: emailResult.error?.message || 'Failed to send',
              })
              .eq('id', emailSend.id);

            errors.push({ person: person.email, error: emailResult.error });
          }
        } catch (error) {
          errors.push({ person: person.email, error });
        }
      }
    }

    // Update campaign status to sent
    await supabase
      .from('campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    return {
      success: sentCount > 0,
      sent_count: sentCount,
      error: errors.length > 0 ? errors : null,
    };
  } catch (error) {
    // Update campaign status to failed
    await supabase
      .from('campaigns')
      .update({ status: 'failed' })
      .eq('id', campaignId);

    return { success: false, sent_count: 0, error };
  }
}

/**
 * Get campaign statistics
 */
export async function getCampaignStats(
  campaignId: string
): Promise<{ stats: CampaignStats | null; error: any }> {
  try {
    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return { stats: null, error: campaignError || 'Campaign not found' };
    }

    // Get email sends stats
    const { data: sends, error: sendsError } = await supabase
      .from('email_sends')
      .select('status, sent_at, delivered_at, opened_at, clicked_at, bounced_at')
      .eq('campaign_id', campaignId);

    if (sendsError) {
      return { stats: null, error: sendsError };
    }

    const totalSent = sends?.filter((s) => s.sent_at).length || 0;
    const deliveredCount = sends?.filter((s) => s.delivered_at).length || 0;
    const openedCount = sends?.filter((s) => s.opened_at).length || 0;
    const clickedCount = sends?.filter((s) => s.clicked_at).length || 0;
    const bouncedCount = sends?.filter((s) => s.bounced_at).length || 0;
    const failedCount = sends?.filter((s) => s.status === 'failed').length || 0;

    const openRate = totalSent > 0 ? (openedCount / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (clickedCount / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (bouncedCount / totalSent) * 100 : 0;

    return {
      stats: {
        campaign_id: campaignId,
        total_sent: totalSent,
        delivered_count: deliveredCount,
        opened_count: openedCount,
        clicked_count: clickedCount,
        bounced_count: bouncedCount,
        failed_count: failedCount,
        open_rate: Math.round(openRate * 100) / 100,
        click_rate: Math.round(clickRate * 100) / 100,
        bounce_rate: Math.round(bounceRate * 100) / 100,
      },
      error: null,
    };
  } catch (error) {
    return { stats: null, error };
  }
}

/**
 * List campaigns for a workspace
 */
export async function listCampaigns(
  workspaceId: string,
  filters?: {
    status?: 'draft' | 'sending' | 'sent' | 'failed';
    limit?: number;
    offset?: number;
  }
): Promise<{ campaigns: any[]; error: any }> {
  try {
    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      return { campaigns: [], error };
    }

    return { campaigns: campaigns || [], error: null };
  } catch (error) {
    return { campaigns: [], error };
  }
}

/**
 * Get campaign by ID
 */
export async function getCampaign(
  campaignId: string
): Promise<{ campaign: any; error: any }> {
  try {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) {
      return { campaign: null, error };
    }

    return { campaign, error: null };
  } catch (error) {
    return { campaign: null, error };
  }
}
