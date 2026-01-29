/**
 * Campaign Statistics API (BS-703)
 *
 * GET /api/campaigns/[campaignId]/stats - Get campaign performance stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getCampaign,
  getCampaignStats,
} from '@/lib/campaigns/broadcast-service';

type Params = {
  campaignId: string;
};

export async function GET(
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

    // Get campaign stats
    const { stats, error } = await getCampaignStats(campaignId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to get campaign stats', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error in GET /api/campaigns/[campaignId]/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
