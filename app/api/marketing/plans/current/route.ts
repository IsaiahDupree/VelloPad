// Get current week's marketing plan
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWeekPlan } from '@/lib/marketing/plan-service';

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

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    const plan = await getCurrentWeekPlan(workspaceId);

    if (!plan) {
      return NextResponse.json({ plan: null, message: 'No plan for current week' });
    }

    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error('GET /api/marketing/plans/current error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
