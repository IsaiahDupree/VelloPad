/**
 * Campaign Send API (BS-703)
 *
 * POST /api/campaigns/[campaignId]/send - Send campaign to targeted segments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getCampaign,
  sendBroadcastCampaign,
} from '@/lib/campaigns/broadcast-service';

type Params = {
  campaignId: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId } = params;

    // Get campaign to verify permissions
    const { campaign, error: campaignError } = await getCampaign(campaignId);

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify user has admin access to workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', campaign.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Send campaign
    const { success, sent_count, error } = await sendBroadcastCampaign(
      campaignId
    );

    if (!success || error) {
      return NextResponse.json(
        {
          error: 'Failed to send campaign',
          details: error,
          sent_count,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sent_count,
      message: `Campaign sent to ${sent_count} recipients`,
    });
  } catch (error) {
    console.error('Error in POST /api/campaigns/[campaignId]/send:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
