// Marketing Task Service
// Core service layer for marketing task CRUD operations

import { createClient } from '@/lib/supabase/server';
import type {
  MarketingTask,
  CreateTaskParams,
  UpdateTaskParams,
  TaskResults,
  TaskStatus,
} from './types';

/**
 * Create a new marketing task
 */
export async function createTask(params: CreateTaskParams): Promise<MarketingTask> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketing_tasks')
    .insert([
      {
        title: params.title,
        description: params.description || null,
        task_type: params.task_type,
        priority: params.priority || 'medium',
        due_date: params.due_date,
        assigned_to: params.assigned_to || null,
        workspace_id: params.workspace_id,
        related_segment_id: params.related_segment_id || null,
        related_campaign_id: params.related_campaign_id || null,
        is_generated: params.is_generated || false,
        weekly_plan_id: params.weekly_plan_id || null,
        status: 'pending',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Failed to create marketing task:', error);
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return data;
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string): Promise<MarketingTask | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketing_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Task not found
    }
    console.error('Failed to get marketing task:', error);
    throw new Error(`Failed to get task: ${error.message}`);
  }

  return data;
}

/**
 * Get all tasks for a workspace with optional filters
 */
export async function getTasks(
  workspaceId: string,
  filters?: {
    status?: TaskStatus | TaskStatus[];
    task_type?: string;
    assigned_to?: string;
    due_date?: string;
    weekly_plan_id?: string;
  }
): Promise<MarketingTask[]> {
  const supabase = await createClient();

  let query = supabase
    .from('marketing_tasks')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.task_type) {
    query = query.eq('task_type', filters.task_type);
  }

  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }

  if (filters?.due_date) {
    query = query.eq('due_date', filters.due_date);
  }

  if (filters?.weekly_plan_id) {
    query = query.eq('weekly_plan_id', filters.weekly_plan_id);
  }

  query = query.order('due_date', { ascending: true }).order('priority', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get marketing tasks:', error);
    throw new Error(`Failed to get tasks: ${error.message}`);
  }

  return data || [];
}

/**
 * Get today's tasks for a workspace
 */
export async function getTodayTasks(workspaceId: string): Promise<MarketingTask[]> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  return getTasks(workspaceId, {
    due_date: today,
    status: ['pending', 'in_progress', 'blocked'],
  });
}

/**
 * Get tasks by date range
 */
export async function getTasksByDateRange(
  workspaceId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<MarketingTask[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketing_tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: true })
    .order('priority', { ascending: false });

  if (error) {
    console.error('Failed to get tasks by date range:', error);
    throw new Error(`Failed to get tasks: ${error.message}`);
  }

  return data || [];
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  updates: UpdateTaskParams
): Promise<MarketingTask> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketing_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update marketing task:', error);
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return data;
}

/**
 * Mark a task as completed with results
 */
export async function completeTask(taskId: string, results: TaskResults): Promise<MarketingTask> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketing_tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      result_metrics: results.metrics,
      notes: results.notes || null,
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Failed to complete marketing task:', error);
    throw new Error(`Failed to complete task: ${error.message}`);
  }

  return data;
}

/**
 * Assign a task to a user
 */
export async function assignTask(taskId: string, userId: string | null): Promise<MarketingTask> {
  return updateTask(taskId, { assigned_to: userId });
}

/**
 * Mark a task as in progress
 */
export async function startTask(taskId: string): Promise<MarketingTask> {
  return updateTask(taskId, { status: 'in_progress' });
}

/**
 * Mark a task as blocked with reason
 */
export async function blockTask(taskId: string, reason: string): Promise<MarketingTask> {
  return updateTask(taskId, {
    status: 'blocked',
    blocked_reason: reason,
  });
}

/**
 * Cancel a task
 */
export async function cancelTask(taskId: string): Promise<MarketingTask> {
  return updateTask(taskId, { status: 'cancelled' });
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('marketing_tasks').delete().eq('id', taskId);

  if (error) {
    console.error('Failed to delete marketing task:', error);
    throw new Error(`Failed to delete task: ${error.message}`);
  }
}

/**
 * Bulk create tasks (useful for weekly plan generation)
 */
export async function createTasksBatch(tasks: CreateTaskParams[]): Promise<MarketingTask[]> {
  const supabase = await createClient();

  const taskRows = tasks.map((task) => ({
    title: task.title,
    description: task.description || null,
    task_type: task.task_type,
    priority: task.priority || 'medium',
    due_date: task.due_date,
    assigned_to: task.assigned_to || null,
    workspace_id: task.workspace_id,
    related_segment_id: task.related_segment_id || null,
    related_campaign_id: task.related_campaign_id || null,
    is_generated: task.is_generated || false,
    weekly_plan_id: task.weekly_plan_id || null,
    status: 'pending',
  }));

  const { data, error } = await supabase
    .from('marketing_tasks')
    .insert(taskRows)
    .select();

  if (error) {
    console.error('Failed to create tasks batch:', error);
    throw new Error(`Failed to create tasks: ${error.message}`);
  }

  return data || [];
}

/**
 * Get task completion statistics for a date range
 */
export async function getTaskStats(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<{
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  blocked: number;
  cancelled: number;
  completion_rate: number;
}> {
  const tasks = await getTasksByDateRange(workspaceId, startDate, endDate);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const in_progress = tasks.filter((t) => t.status === 'in_progress').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const cancelled = tasks.filter((t) => t.status === 'cancelled').length;

  const completion_rate = total > 0 ? (completed / total) * 100 : 0;

  return {
    total,
    completed,
    in_progress,
    pending,
    blocked,
    cancelled,
    completion_rate: Math.round(completion_rate * 100) / 100,
  };
}
