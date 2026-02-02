// AI-Powered Weekly Plan Generation API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildWeeklyPlanContext, generateWeeklyPlan } from '@/lib/marketing/plan-generator';
import { createWeeklyPlan } from '@/lib/marketing/plan-service';
import { createTasksBatch } from '@/lib/marketing/task-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspace_id } = await request.json();

    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    // Build context for AI generation
    const context = await buildWeeklyPlanContext(workspace_id);

    // Generate plan using AI
    const { plan: generatedPlan, tasks: generatedTasks } = await generateWeeklyPlan(context);

    // Save plan to database
    const savedPlan = await createWeeklyPlan({
      week_start_date: generatedPlan.week_start_date,
      week_end_date: generatedPlan.week_end_date,
      plan_summary: generatedPlan.plan_summary,
      goals: generatedPlan.goals,
      strategies: generatedPlan.strategies,
      workspace_id: generatedPlan.workspace_id,
      generated_by: 'ai',
      generation_context: context,
    });

    // Link tasks to the plan and create them
    const tasksWithPlanId = generatedTasks.map((task) => ({
      ...task,
      weekly_plan_id: savedPlan.id,
    }));

    const savedTasks = await createTasksBatch(tasksWithPlanId);

    return NextResponse.json({
      plan: savedPlan,
      tasks: savedTasks,
      task_count: savedTasks.length,
    });
  } catch (error: any) {
    console.error('POST /api/marketing/plans/generate error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate weekly plan',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
