// Complete a marketing task
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeTask } from '@/lib/marketing/task-service';
import type { TaskResults } from '@/lib/marketing/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: TaskResults = await request.json();

    if (!results.metrics) {
      return NextResponse.json({ error: 'metrics field required' }, { status: 400 });
    }

    const task = await completeTask(taskId, results);

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('POST /api/marketing/tasks/[taskId]/complete error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
