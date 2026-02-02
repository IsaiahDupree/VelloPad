// Weekly Marketing Plan Service
// Manages weekly plans in the database

import { createClient } from '@/lib/supabase/server';
import type {
  WeeklyPlan,
  CreateWeeklyPlanParams,
  UpdateWeeklyPlanParams,
  PlanStatus,
} from './types';

/**
 * Create a new weekly plan
 */
export async function createWeeklyPlan(params: CreateWeeklyPlanParams): Promise<WeeklyPlan> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketing_weekly_plans')
    .insert([
      {
        week_start_date: params.week_start_date,
        week_end_date: params.week_end_date,
        plan_summary: params.plan_summary,
        goals: params.goals,
        strategies: params.strategies,
        workspace_id: params.workspace_id,
        generated_by: params.generated_by || 'manual',
        generation_context: params.generation_context || {},
        status: 'draft',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Failed to create weekly plan:', error);
    throw new Error(`Failed to create plan: ${error.message}`);
  }

  return data;
}

/**
 * Get a single plan by ID
 */
export async function getWeeklyPlan(planId: string): Promise<WeeklyPlan | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketing_weekly_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Failed to get weekly plan:', error);
    throw new Error(`Failed to get plan: ${error.message}`);
  }

  return data;
}

/**
 * Get current week's plan for a workspace
 */
export async function getCurrentWeekPlan(workspaceId: string): Promise<WeeklyPlan | null> {
  const supabase = await createClient();

  // Get Monday of current week
  const today = new Date();
  const dayOfWeek = today.getDay() || 7; // Sunday = 0, make it 7
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - (dayOfWeek - 1));
  const weekStartStr = currentWeekStart.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('marketing_weekly_plans')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('week_start_date', weekStartStr)
    .maybeSingle();

  if (error) {
    console.error('Failed to get current week plan:', error);
    throw new Error(`Failed to get plan: ${error.message}`);
  }

  return data;
}

/**
 * Get all plans for a workspace
 */
export async function getWeeklyPlans(
  workspaceId: string,
  filters?: {
    status?: PlanStatus;
    limit?: number;
  }
): Promise<WeeklyPlan[]> {
  const supabase = await createClient();

  let query = supabase
    .from('marketing_weekly_plans')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('week_start_date', { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get weekly plans:', error);
    throw new Error(`Failed to get plans: ${error.message}`);
  }

  return data || [];
}

/**
 * Update a weekly plan
 */
export async function updateWeeklyPlan(
  planId: string,
  updates: UpdateWeeklyPlanParams
): Promise<WeeklyPlan> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketing_weekly_plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update weekly plan:', error);
    throw new Error(`Failed to update plan: ${error.message}`);
  }

  return data;
}

/**
 * Approve a weekly plan
 */
export async function approveWeeklyPlan(planId: string, userId: string): Promise<WeeklyPlan> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketing_weekly_plans')
    .update({
      status: 'active',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) {
    console.error('Failed to approve weekly plan:', error);
    throw new Error(`Failed to approve plan: ${error.message}`);
  }

  return data;
}

/**
 * Delete a weekly plan
 */
export async function deleteWeeklyPlan(planId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('marketing_weekly_plans').delete().eq('id', planId);

  if (error) {
    console.error('Failed to delete weekly plan:', error);
    throw new Error(`Failed to delete plan: ${error.message}`);
  }
}
