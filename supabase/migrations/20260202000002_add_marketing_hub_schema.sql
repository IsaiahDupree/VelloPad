-- BS-802: Marketing Hub Schema
-- Daily tasks + weekly plan generator for marketing team

-- =====================================================
-- Marketing Tasks Table
-- =====================================================
CREATE TABLE marketing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL, -- 'email', 'content', 'social', 'seo', 'analytics', 'campaign'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked', 'cancelled'
  completed_at TIMESTAMPTZ,
  blocked_reason TEXT,

  -- Due date
  due_date DATE NOT NULL,

  -- Context
  related_segment_id UUID,
  related_campaign_id UUID,

  -- Generated task metadata
  is_generated BOOLEAN DEFAULT false, -- true if AI-generated
  weekly_plan_id UUID,

  -- Result tracking
  result_metrics JSONB DEFAULT '{}'::JSONB, -- e.g., {"emails_sent": 150, "open_rate": 0.24}
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_marketing_tasks_status ON marketing_tasks(status);
CREATE INDEX idx_marketing_tasks_due_date ON marketing_tasks(due_date);
CREATE INDEX idx_marketing_tasks_assigned_to ON marketing_tasks(assigned_to);
CREATE INDEX idx_marketing_tasks_task_type ON marketing_tasks(task_type);
CREATE INDEX idx_marketing_tasks_weekly_plan ON marketing_tasks(weekly_plan_id);
CREATE INDEX idx_marketing_tasks_workspace ON marketing_tasks(workspace_id);

-- =====================================================
-- Marketing Weekly Plans Table
-- =====================================================
CREATE TABLE marketing_weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan details
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- Plan content
  plan_summary TEXT NOT NULL, -- AI-generated summary
  goals JSONB NOT NULL DEFAULT '[]'::JSONB, -- [{"metric": "signups", "target": 50, "current": 25}]
  strategies JSONB NOT NULL DEFAULT '[]'::JSONB, -- [{"name": "Email Campaign", "description": "..."}]

  -- Plan metadata
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  generated_by VARCHAR(50) DEFAULT 'ai', -- 'ai', 'manual'
  generation_context JSONB DEFAULT '{}'::JSONB, -- Context used for AI generation

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'completed', 'archived'
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(workspace_id, week_start_date)
);

-- Indexes for performance
CREATE INDEX idx_weekly_plans_week_start ON marketing_weekly_plans(week_start_date DESC);
CREATE INDEX idx_weekly_plans_status ON marketing_weekly_plans(status);
CREATE INDEX idx_weekly_plans_workspace ON marketing_weekly_plans(workspace_id);

-- Foreign key for marketing_tasks -> weekly_plans
ALTER TABLE marketing_tasks
ADD CONSTRAINT fk_marketing_tasks_weekly_plan
FOREIGN KEY (weekly_plan_id) REFERENCES marketing_weekly_plans(id) ON DELETE SET NULL;

-- =====================================================
-- Marketing Metrics Snapshot Table
-- =====================================================
CREATE TABLE marketing_metrics_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time period
  snapshot_date DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Core metrics (from event collection)
  new_signups INT DEFAULT 0,
  activated_users INT DEFAULT 0, -- completed first book or chapter
  books_created INT DEFAULT 0,
  pdfs_generated INT DEFAULT 0,
  orders_placed INT DEFAULT 0,

  -- Revenue metrics
  revenue_cents INT DEFAULT 0,
  mrr_cents INT DEFAULT 0, -- Monthly Recurring Revenue

  -- Engagement metrics
  active_users INT DEFAULT 0,
  avg_session_duration_seconds INT DEFAULT 0,

  -- Email metrics
  emails_sent INT DEFAULT 0,
  emails_opened INT DEFAULT 0,
  emails_clicked INT DEFAULT 0,

  -- Conversion funnel
  visitor_to_signup_rate NUMERIC(5, 2), -- percentage
  signup_to_activation_rate NUMERIC(5, 2),
  activation_to_order_rate NUMERIC(5, 2),

  -- Traffic sources
  utm_sources JSONB DEFAULT '{}'::JSONB, -- {"google": 50, "facebook": 30}

  -- Computed aggregates
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(workspace_id, snapshot_date, period_type)
);

-- Indexes for performance
CREATE INDEX idx_metrics_snapshot_date ON marketing_metrics_snapshot(snapshot_date DESC);
CREATE INDEX idx_metrics_snapshot_period ON marketing_metrics_snapshot(period_type);
CREATE INDEX idx_metrics_workspace ON marketing_metrics_snapshot(workspace_id);

-- =====================================================
-- Marketing Content Ideas Table
-- =====================================================
CREATE TABLE marketing_content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Idea details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'blog', 'tutorial', 'social', 'email', 'video'

  -- SEO/Targeting
  target_keywords TEXT[], -- ["book writing tips", "self-publishing guide"]
  target_audience VARCHAR(100), -- "new writers", "self-publishers"

  -- Priority & scoring
  priority_score INT DEFAULT 50, -- 0-100, AI-generated based on search volume, competition
  estimated_search_volume INT,
  keyword_difficulty INT, -- 0-100

  -- Status
  status VARCHAR(50) DEFAULT 'idea', -- 'idea', 'planned', 'in_progress', 'published', 'rejected'
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Related content
  related_url TEXT, -- If published
  published_at TIMESTAMPTZ,

  -- Generation metadata
  generated_by VARCHAR(50) DEFAULT 'ai', -- 'ai', 'manual'
  generation_context JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_content_ideas_status ON marketing_content_ideas(status);
CREATE INDEX idx_content_ideas_content_type ON marketing_content_ideas(content_type);
CREATE INDEX idx_content_ideas_priority ON marketing_content_ideas(priority_score DESC);
CREATE INDEX idx_content_ideas_workspace ON marketing_content_ideas(workspace_id);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE marketing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_metrics_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content_ideas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketing_tasks
CREATE POLICY "Users can view tasks in their workspace"
  ON marketing_tasks FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/Owner can manage tasks"
  ON marketing_tasks FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for marketing_weekly_plans
CREATE POLICY "Users can view plans in their workspace"
  ON marketing_weekly_plans FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/Owner can manage plans"
  ON marketing_weekly_plans FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for marketing_metrics_snapshot
CREATE POLICY "Users can view metrics in their workspace"
  ON marketing_metrics_snapshot FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/Owner can manage metrics"
  ON marketing_metrics_snapshot FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for marketing_content_ideas
CREATE POLICY "Users can view content ideas in their workspace"
  ON marketing_content_ideas FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/Owner can manage content ideas"
  ON marketing_content_ideas FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_marketing_tasks_updated_at
  BEFORE UPDATE ON marketing_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER update_marketing_weekly_plans_updated_at
  BEFORE UPDATE ON marketing_weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER update_marketing_content_ideas_updated_at
  BEFORE UPDATE ON marketing_content_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_updated_at();

-- Function to get current week's plan
CREATE OR REPLACE FUNCTION get_current_week_plan(p_workspace_id UUID)
RETURNS SETOF marketing_weekly_plans AS $$
DECLARE
  current_week_start DATE;
BEGIN
  -- Get Monday of current week
  current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;

  RETURN QUERY
  SELECT * FROM marketing_weekly_plans
  WHERE workspace_id = p_workspace_id
    AND week_start_date = current_week_start
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get today's tasks
CREATE OR REPLACE FUNCTION get_today_tasks(p_workspace_id UUID)
RETURNS SETOF marketing_tasks AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM marketing_tasks
  WHERE workspace_id = p_workspace_id
    AND due_date = CURRENT_DATE
    AND status NOT IN ('completed', 'cancelled')
  ORDER BY priority DESC, created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE marketing_tasks IS 'Marketing tasks for daily execution and tracking';
COMMENT ON TABLE marketing_weekly_plans IS 'AI-generated weekly marketing plans with goals and strategies';
COMMENT ON TABLE marketing_metrics_snapshot IS 'Daily/weekly snapshots of key marketing metrics';
COMMENT ON TABLE marketing_content_ideas IS 'SEO-driven content ideas for blog, tutorials, and social';

COMMENT ON COLUMN marketing_tasks.task_type IS 'Type of task: email, content, social, seo, analytics, campaign';
COMMENT ON COLUMN marketing_tasks.priority IS 'Task priority: low, medium, high, urgent';
COMMENT ON COLUMN marketing_tasks.status IS 'Current status: pending, in_progress, completed, blocked, cancelled';
COMMENT ON COLUMN marketing_tasks.is_generated IS 'True if task was AI-generated from weekly plan';

COMMENT ON COLUMN marketing_weekly_plans.goals IS 'Array of goal objects with metric, target, and current values';
COMMENT ON COLUMN marketing_weekly_plans.strategies IS 'Array of strategy objects with name and description';
COMMENT ON COLUMN marketing_weekly_plans.generation_context IS 'Context data used by AI to generate the plan';

COMMENT ON COLUMN marketing_metrics_snapshot.period_type IS 'Aggregation period: daily, weekly, monthly';
COMMENT ON COLUMN marketing_metrics_snapshot.utm_sources IS 'Breakdown of traffic by UTM source';

COMMENT ON COLUMN marketing_content_ideas.priority_score IS 'AI-generated score (0-100) based on SEO potential';
COMMENT ON COLUMN marketing_content_ideas.keyword_difficulty IS 'SEO keyword difficulty score (0-100)';
