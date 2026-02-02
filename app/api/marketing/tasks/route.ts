// Marketing Tasks API
// GET (list tasks), POST (create task)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTask, getTasks } from '@/lib/marketing/task-service';
import type { CreateTaskParams } from '@/lib/marketing/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace from query params or use default
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');
    const status = searchParams.get('status');
    const task_type = searchParams.get('task_type');
    const assigned_to = searchParams.get('assigned_to');
    const due_date = searchParams.get('due_date');
    const weekly_plan_id = searchParams.get('weekly_plan_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    const filters: any = {};
    if (status) {
      filters.status = status.includes(',') ? status.split(',') : status;
    }
    if (task_type) filters.task_type = task_type;
    if (assigned_to) filters.assigned_to = assigned_to;
    if (due_date) filters.due_date = due_date;
    if (weekly_plan_id) filters.weekly_plan_id = weekly_plan_id;

    const tasks = await getTasks(workspaceId, filters);

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('GET /api/marketing/tasks error:', error);
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

    const body: CreateTaskParams = await request.json();

    // Validate required fields
    if (!body.title || !body.task_type || !body.due_date || !body.workspace_id) {
      return NextResponse.json(
        { error: 'Missing required fields: title, task_type, due_date, workspace_id' },
        { status: 400 }
      );
    }

    const task = await createTask(body);

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/marketing/tasks error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
