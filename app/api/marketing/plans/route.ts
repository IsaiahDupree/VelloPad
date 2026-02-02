// Weekly Marketing Plans API
// GET (list plans), POST (create plan manually)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createWeeklyPlan, getWeeklyPlans } from '@/lib/marketing/plan-service';
import type { CreateWeeklyPlanParams } from '@/lib/marketing/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit, 10);

    const plans = await getWeeklyPlans(workspaceId, filters);

    return NextResponse.json({ plans });
  } catch (error: any) {
    console.error('GET /api/marketing/plans error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateWeeklyPlanParams = await request.json();

    // Validate required fields
    if (
      !body.week_start_date ||
      !body.week_end_date ||
      !body.plan_summary ||
      !body.workspace_id
    ) {
      return NextResponse.json(
        {
          error: 'Missing required fields: week_start_date, week_end_date, plan_summary, workspace_id',
        },
        { status: 400 }
      );
    }

    const plan = await createWeeklyPlan(body);

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/marketing/plans error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
