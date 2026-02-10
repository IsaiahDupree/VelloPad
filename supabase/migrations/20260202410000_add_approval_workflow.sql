-- ========================================
-- Photo Book Approval Workflow
-- Feature: PB-030
-- Client approval workflow for photographers delivering albums
-- ========================================

-- Approval status enum
CREATE TYPE approval_status AS ENUM (
  'draft',
  'submitted',
  'in_review',
  'changes_requested',
  'approved',
  'rejected'
);

-- Approval decision enum
CREATE TYPE approval_decision AS ENUM ('approve', 'request_changes', 'reject');

-- ========================================
-- Approval Requests Table
-- ========================================
CREATE TABLE photo_book_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES photo_book_projects(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_email TEXT NOT NULL,
  reviewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  status approval_status NOT NULL DEFAULT 'submitted',

  -- Request details
  title TEXT NOT NULL,
  message TEXT,
  deadline TIMESTAMPTZ,

  -- Review details
  reviewed_at TIMESTAMPTZ,
  decision approval_decision,
  reviewer_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only one active approval request per project
  CONSTRAINT one_active_approval_per_project UNIQUE (project_id, status)
    WHERE status NOT IN ('approved', 'rejected')
);

-- ========================================
-- Approval Feedback Table (Page-specific comments)
-- ========================================
CREATE TABLE photo_book_approval_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id UUID NOT NULL REFERENCES photo_book_approval_requests(id) ON DELETE CASCADE,
  page_id UUID REFERENCES photo_book_pages(id) ON DELETE CASCADE,

  -- Feedback details
  comment TEXT NOT NULL,
  position JSONB, -- {x, y, pageNumber} for pinned comments
  is_resolved BOOLEAN NOT NULL DEFAULT false,

  -- Who created this feedback
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- Approval History Table
-- ========================================
CREATE TABLE photo_book_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id UUID NOT NULL REFERENCES photo_book_approval_requests(id) ON DELETE CASCADE,

  -- Status change
  from_status approval_status,
  to_status approval_status NOT NULL,

  -- Who made the change
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- Indexes
-- ========================================
CREATE INDEX idx_approval_requests_project ON photo_book_approval_requests(project_id);
CREATE INDEX idx_approval_requests_reviewer ON photo_book_approval_requests(reviewer_user_id);
CREATE INDEX idx_approval_requests_status ON photo_book_approval_requests(status);
CREATE INDEX idx_approval_requests_deadline ON photo_book_approval_requests(deadline);

CREATE INDEX idx_approval_feedback_request ON photo_book_approval_feedback(approval_request_id);
CREATE INDEX idx_approval_feedback_page ON photo_book_approval_feedback(page_id);
CREATE INDEX idx_approval_feedback_resolved ON photo_book_approval_feedback(is_resolved);

CREATE INDEX idx_approval_history_request ON photo_book_approval_history(approval_request_id);
CREATE INDEX idx_approval_history_created ON photo_book_approval_history(created_at DESC);

-- ========================================
-- Triggers
-- ========================================

-- Update timestamp on changes
CREATE TRIGGER update_approval_requests_updated_at
  BEFORE UPDATE ON photo_book_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_feedback_updated_at
  BEFORE UPDATE ON photo_book_approval_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Log approval status changes
CREATE OR REPLACE FUNCTION log_approval_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status change to history
  INSERT INTO photo_book_approval_history (
    approval_request_id,
    from_status,
    to_status,
    changed_by,
    notes
  ) VALUES (
    NEW.id,
    OLD.status,
    NEW.status,
    auth.uid(),
    CASE
      WHEN NEW.status = 'approved' THEN 'Project approved'
      WHEN NEW.status = 'rejected' THEN 'Project rejected'
      WHEN NEW.status = 'changes_requested' THEN 'Changes requested'
      WHEN NEW.status = 'in_review' THEN 'Review started'
      ELSE 'Status updated'
    END
  );

  -- Log activity
  INSERT INTO photo_book_activity (project_id, user_id, activity_type, target_id, metadata)
  VALUES (
    NEW.project_id,
    auth.uid(),
    'project_published', -- Reuse existing activity type
    NEW.id,
    jsonb_build_object(
      'approval_status', NEW.status,
      'reviewer_email', NEW.reviewer_email
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approval_status_change_trigger
  AFTER UPDATE OF status ON photo_book_approval_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_approval_status_change();

-- Create collaborator for reviewer when they first access
CREATE OR REPLACE FUNCTION auto_add_reviewer_collaborator()
RETURNS TRIGGER AS $$
BEGIN
  -- If reviewer_user_id is set, add them as a viewer collaborator
  IF NEW.reviewer_user_id IS NOT NULL THEN
    INSERT INTO photo_book_collaborators (
      project_id,
      user_id,
      role,
      invited_by,
      accepted_at
    )
    VALUES (
      NEW.project_id,
      NEW.reviewer_user_id,
      'viewer',
      NEW.requested_by,
      now()
    )
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_reviewer_collaborator_trigger
  AFTER INSERT OR UPDATE OF reviewer_user_id ON photo_book_approval_requests
  FOR EACH ROW
  WHEN (NEW.reviewer_user_id IS NOT NULL)
  EXECUTE FUNCTION auto_add_reviewer_collaborator();

-- ========================================
-- Row Level Security (RLS)
-- ========================================

ALTER TABLE photo_book_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_book_approval_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_book_approval_history ENABLE ROW LEVEL SECURITY;

-- Approval Requests: Project collaborators can view
CREATE POLICY select_approval_requests ON photo_book_approval_requests
  FOR SELECT
  USING (
    -- Project collaborators can view
    EXISTS (
      SELECT 1 FROM photo_book_collaborators pc
      WHERE pc.project_id = photo_book_approval_requests.project_id
        AND pc.user_id = auth.uid()
        AND pc.accepted_at IS NOT NULL
    )
    OR
    -- Reviewer can view
    reviewer_user_id = auth.uid()
  );

-- Approval Requests: Project editors/owners can create
CREATE POLICY insert_approval_requests ON photo_book_approval_requests
  FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM photo_book_collaborators pc
      WHERE pc.project_id = photo_book_approval_requests.project_id
        AND pc.user_id = auth.uid()
        AND pc.role IN ('owner', 'editor')
        AND pc.accepted_at IS NOT NULL
    )
  );

-- Approval Requests: Creator or reviewer can update
CREATE POLICY update_approval_requests ON photo_book_approval_requests
  FOR UPDATE
  USING (
    requested_by = auth.uid()
    OR
    reviewer_user_id = auth.uid()
  );

-- Approval Feedback: Can be viewed by project collaborators and reviewer
CREATE POLICY select_approval_feedback ON photo_book_approval_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM photo_book_approval_requests ar
      WHERE ar.id = photo_book_approval_feedback.approval_request_id
        AND (
          ar.reviewer_user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 FROM photo_book_collaborators pc
            WHERE pc.project_id = ar.project_id
              AND pc.user_id = auth.uid()
              AND pc.accepted_at IS NOT NULL
          )
        )
    )
  );

-- Approval Feedback: Can be created by reviewer or project collaborators
CREATE POLICY insert_approval_feedback ON photo_book_approval_feedback
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM photo_book_approval_requests ar
      WHERE ar.id = photo_book_approval_feedback.approval_request_id
        AND (
          ar.reviewer_user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 FROM photo_book_collaborators pc
            WHERE pc.project_id = ar.project_id
              AND pc.user_id = auth.uid()
              AND pc.accepted_at IS NOT NULL
          )
        )
    )
  );

-- Approval Feedback: Creator can update their own feedback
CREATE POLICY update_approval_feedback ON photo_book_approval_feedback
  FOR UPDATE
  USING (created_by = auth.uid());

-- Approval History: Viewable by project collaborators and reviewer
CREATE POLICY select_approval_history ON photo_book_approval_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM photo_book_approval_requests ar
      WHERE ar.id = photo_book_approval_history.approval_request_id
        AND (
          ar.reviewer_user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 FROM photo_book_collaborators pc
            WHERE pc.project_id = ar.project_id
              AND pc.user_id = auth.uid()
              AND pc.accepted_at IS NOT NULL
          )
        )
    )
  );

-- ========================================
-- Helper Functions
-- ========================================

-- Get approval request summary
CREATE OR REPLACE FUNCTION get_approval_request_summary(approval_request_id_param UUID)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  status approval_status,
  reviewer_email TEXT,
  feedback_count BIGINT,
  unresolved_feedback_count BIGINT,
  created_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id,
    ar.project_id,
    ar.status,
    ar.reviewer_email,
    COUNT(af.id) as feedback_count,
    COUNT(af.id) FILTER (WHERE af.is_resolved = false) as unresolved_feedback_count,
    ar.created_at,
    ar.reviewed_at
  FROM photo_book_approval_requests ar
  LEFT JOIN photo_book_approval_feedback af ON af.approval_request_id = ar.id
  WHERE ar.id = approval_request_id_param
  GROUP BY ar.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Comments
-- ========================================
COMMENT ON TABLE photo_book_approval_requests IS 'PB-030: Approval workflow requests for photo book projects';
COMMENT ON TABLE photo_book_approval_feedback IS 'PB-030: Page-specific feedback/comments for approval requests';
COMMENT ON TABLE photo_book_approval_history IS 'PB-030: Audit trail of approval status changes';
