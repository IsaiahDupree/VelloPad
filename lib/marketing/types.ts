// Marketing Hub Types

export type TaskType = 'email' | 'content' | 'social' | 'seo' | 'analytics' | 'campaign';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

export interface MarketingTask {
  id: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string; // ISO date string
  assigned_to: string | null;
  workspace_id: string;
  completed_at: string | null;
  blocked_reason: string | null;
  related_segment_id: string | null;
  related_campaign_id: string | null;
  is_generated: boolean;
  weekly_plan_id: string | null;
  result_metrics: Record<string, any>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  task_type: TaskType;
  priority?: TaskPriority;
  due_date: string; // ISO date string (YYYY-MM-DD)
  assigned_to?: string;
  workspace_id: string;
  related_segment_id?: string;
  related_campaign_id?: string;
  is_generated?: boolean;
  weekly_plan_id?: string;
}

export interface UpdateTaskParams {
  title?: string;
  description?: string;
  task_type?: TaskType;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string;
  assigned_to?: string | null;
  blocked_reason?: string | null;
  result_metrics?: Record<string, any>;
  notes?: string;
}

export interface TaskResults {
  metrics: Record<string, any>;
  notes?: string;
}

export type PlanStatus = 'draft' | 'active' | 'completed' | 'archived';
export type GeneratedBy = 'ai' | 'manual';

export interface WeeklyPlan {
  id: string;
  week_start_date: string; // ISO date string
  week_end_date: string; // ISO date string
  plan_summary: string;
  goals: Goal[];
  strategies: Strategy[];
  workspace_id: string;
  generated_by: GeneratedBy;
  generation_context: Record<string, any>;
  status: PlanStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  metric: string;
  target: number;
  current: number;
  unit?: string;
  description?: string;
}

export interface Strategy {
  name: string;
  description: string;
  priority?: number;
  category?: string;
}

export interface CreateWeeklyPlanParams {
  week_start_date: string;
  week_end_date: string;
  plan_summary: string;
  goals: Goal[];
  strategies: Strategy[];
  workspace_id: string;
  generated_by?: GeneratedBy;
  generation_context?: Record<string, any>;
}

export interface UpdateWeeklyPlanParams {
  plan_summary?: string;
  goals?: Goal[];
  strategies?: Strategy[];
  status?: PlanStatus;
}

export type PeriodType = 'daily' | 'weekly' | 'monthly';

export interface MetricsSnapshot {
  id: string;
  snapshot_date: string; // ISO date string
  period_type: PeriodType;
  workspace_id: string;

  // Core metrics
  new_signups: number;
  activated_users: number;
  books_created: number;
  pdfs_generated: number;
  orders_placed: number;

  // Revenue metrics
  revenue_cents: number;
  mrr_cents: number;

  // Engagement metrics
  active_users: number;
  avg_session_duration_seconds: number;

  // Email metrics
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;

  // Conversion funnel
  visitor_to_signup_rate: number | null;
  signup_to_activation_rate: number | null;
  activation_to_order_rate: number | null;

  // Traffic sources
  utm_sources: Record<string, number>;

  computed_at: string;
  created_at: string;
}

export interface DashboardMetrics {
  today: MetricsSnapshot | null;
  yesterday: MetricsSnapshot | null;
  thisWeek: MetricsSnapshot | null;
  lastWeek: MetricsSnapshot | null;
  trends: {
    signups: TrendData;
    activations: TrendData;
    revenue: TrendData;
  };
}

export interface TrendData {
  dates: string[];
  values: number[];
  change_percent: number;
}

export type ContentType = 'blog' | 'tutorial' | 'social' | 'email' | 'video';
export type ContentIdeaStatus = 'idea' | 'planned' | 'in_progress' | 'published' | 'rejected';

export interface ContentIdea {
  id: string;
  title: string;
  description: string;
  content_type: ContentType;
  target_keywords: string[];
  target_audience: string | null;
  priority_score: number;
  estimated_search_volume: number | null;
  keyword_difficulty: number | null;
  status: ContentIdeaStatus;
  assigned_to: string | null;
  workspace_id: string;
  related_url: string | null;
  published_at: string | null;
  generated_by: GeneratedBy;
  generation_context: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateContentIdeaParams {
  title: string;
  description: string;
  content_type: ContentType;
  target_keywords?: string[];
  target_audience?: string;
  priority_score?: number;
  estimated_search_volume?: number;
  keyword_difficulty?: number;
  workspace_id: string;
  generated_by?: GeneratedBy;
  generation_context?: Record<string, any>;
}

export interface UpdateContentIdeaParams {
  title?: string;
  description?: string;
  content_type?: ContentType;
  target_keywords?: string[];
  target_audience?: string;
  priority_score?: number;
  status?: ContentIdeaStatus;
  assigned_to?: string | null;
  related_url?: string;
  published_at?: string;
}

// Weekly Plan Generation Context
export interface WeeklyPlanContext {
  previousWeekMetrics: MetricsSnapshot | null;
  currentGoals: Goal[];
  recentCampaigns?: any[]; // From campaigns table
  audienceSegments?: any[]; // From segments table
  contentPerformance?: any[];
  workspace_id: string;
}

// AI Generation Response Types
export interface GeneratedWeeklyPlan {
  plan: WeeklyPlan;
  tasks: CreateTaskParams[];
}

export interface GeneratedContentIdeas {
  ideas: ContentIdea[];
}
