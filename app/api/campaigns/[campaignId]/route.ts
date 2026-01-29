/**
 * Admin Campaign Detail API (BS-703)
 *
 * GET /api/campaigns/[campaignId] - Get campaign details
 * PATCH /api/campaigns/[campaignId] - Update campaign
 * DELETE /api/campaigns/[campaignId] - Delete campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getCampaign,
  updateBroadcastCampaign,
  deleteBroadcastCampaign,
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

    // Get campaign
    const { campaign, error } = await getCampaign(campaignId);

    if (error) {
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

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error in GET /api/campaigns/[campaignId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = await request.json();

    // Get existing campaign to verify permissions
    const { campaign: existing, error: existingError } = await getCampaign(
      campaignId
    );

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify user has admin access to workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', existing.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Update campaign
    const { campaign, error } = await updateBroadcastCampaign(campaignId, body);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update campaign', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error in PATCH /api/campaigns/[campaignId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Get existing campaign to verify permissions
    const { campaign: existing, error: existingError } = await getCampaign(
      campaignId
    );

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify user has admin access to workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', existing.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Delete campaign
    const { success, error } = await deleteBroadcastCampaign(campaignId);

    if (error || !success) {
      return NextResponse.json(
        { error: 'Failed to delete campaign', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/campaigns/[campaignId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
