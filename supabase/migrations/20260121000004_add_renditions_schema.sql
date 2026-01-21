-- Migration: Add renditions and render_jobs schema
-- Feature: DB-003
-- Description: Tables for PDF rendition pipeline and job tracking
-- Date: 2026-01-21

-- ============================================================================
-- RENDITIONS TABLE
-- ============================================================================
-- Stores final rendered PDFs (interior + cover) for books
CREATE TABLE IF NOT EXISTS renditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  version_snapshot_id UUID REFERENCES version_snapshots(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- PDF artifacts
  interior_pdf_url TEXT,
  cover_pdf_url TEXT,
  combined_pdf_url TEXT, -- Optional: combined for preview

  -- Metadata
  page_count INTEGER,
  file_size_bytes BIGINT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Job enqueued
    'processing',   -- Currently rendering
    'preflight',    -- Running preflight checks
    'completed',    -- Successfully rendered
    'failed',       -- Rendering failed
    'cancelled'     -- User cancelled
  )),

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Preflight results
  preflight_passed BOOLEAN,
  preflight_warnings JSONB, -- Array of warning objects
  preflight_errors JSONB,   -- Array of error objects

  -- Timing
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for renditions
CREATE INDEX idx_renditions_book_id ON renditions(book_id);
CREATE INDEX idx_renditions_workspace_id ON renditions(workspace_id);
CREATE INDEX idx_renditions_status ON renditions(status);
CREATE INDEX idx_renditions_created_at ON renditions(created_at DESC);

-- Updated timestamp trigger for renditions
CREATE TRIGGER set_renditions_updated_at
  BEFORE UPDATE ON renditions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- RENDER_JOBS TABLE
-- ============================================================================
-- Tracks individual rendering jobs in the queue (BullMQ integration)
CREATE TABLE IF NOT EXISTS render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rendition_id UUID NOT NULL REFERENCES renditions(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL UNIQUE, -- BullMQ job ID

  -- Job type
  job_type TEXT NOT NULL CHECK (job_type IN (
    'interior',     -- Render interior PDF
    'cover',        -- Render cover PDF
    'preflight'     -- Run preflight checks
  )),

  -- Queue information
  queue_name TEXT NOT NULL DEFAULT 'rendition',
  priority INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,

  -- Status
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN (
    'waiting',      -- In queue
    'active',       -- Currently processing
    'completed',    -- Successfully completed
    'failed',       -- Failed after retries
    'delayed',      -- Delayed for retry
    'paused'        -- Queue paused
  )),

  -- Execution tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Progress tracking (0-100)
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Result data
  result JSONB,      -- Job result on success
  error JSONB,       -- Error details on failure

  -- Logs (last 10 entries)
  logs JSONB DEFAULT '[]'::jsonb,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for render_jobs
CREATE INDEX idx_render_jobs_rendition_id ON render_jobs(rendition_id);
CREATE INDEX idx_render_jobs_job_id ON render_jobs(job_id);
CREATE INDEX idx_render_jobs_status ON render_jobs(status);
CREATE INDEX idx_render_jobs_job_type ON render_jobs(job_type);
CREATE INDEX idx_render_jobs_created_at ON render_jobs(created_at DESC);

-- Updated timestamp trigger for render_jobs
CREATE TRIGGER set_render_jobs_updated_at
  BEFORE UPDATE ON render_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on renditions
ALTER TABLE renditions ENABLE ROW LEVEL SECURITY;

-- Renditions: Users can view renditions for books in their workspace
CREATE POLICY "Users can view renditions in their workspace"
  ON renditions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Renditions: Users can create renditions for books in their workspace
CREATE POLICY "Users can create renditions in their workspace"
  ON renditions FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Renditions: Users can update renditions in their workspace
CREATE POLICY "Users can update renditions in their workspace"
  ON renditions FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Enable RLS on render_jobs
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;

-- Render jobs: Users can view render jobs for their workspace renditions
CREATE POLICY "Users can view render jobs in their workspace"
  ON render_jobs FOR SELECT
  USING (
    rendition_id IN (
      SELECT id FROM renditions
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Render jobs: Service role can manage all render jobs (for queue workers)
CREATE POLICY "Service role can manage render jobs"
  ON render_jobs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get rendition statistics
CREATE OR REPLACE FUNCTION get_rendition_stats(p_workspace_id UUID)
RETURNS TABLE (
  total_renditions BIGINT,
  pending_renditions BIGINT,
  processing_renditions BIGINT,
  completed_renditions BIGINT,
  failed_renditions BIGINT,
  avg_render_time_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_renditions,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_renditions,
    COUNT(*) FILTER (WHERE status = 'processing')::BIGINT AS processing_renditions,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS completed_renditions,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_renditions,
    AVG(
      EXTRACT(EPOCH FROM (completed_at - started_at))
    ) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL) AS avg_render_time_seconds
  FROM renditions
  WHERE workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to cleanup old failed renditions (retain for 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_renditions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM renditions
  WHERE status = 'failed'
    AND created_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON renditions TO authenticated;
GRANT ALL ON render_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION get_rendition_stats(UUID) TO authenticated;

-- Grant cleanup function to service role only
GRANT EXECUTE ON FUNCTION cleanup_old_renditions() TO service_role;


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE renditions IS 'Stores rendered PDF artifacts for books with preflight results';
COMMENT ON TABLE render_jobs IS 'Tracks individual BullMQ rendering jobs for observability';
COMMENT ON FUNCTION get_rendition_stats(UUID) IS 'Returns rendition statistics for a workspace';
COMMENT ON FUNCTION cleanup_old_renditions() IS 'Cleans up failed renditions older than 7 days';
