-- ========================================
-- Photo Book Collaboration
-- Feature: PB-029
-- Enables multiple users to collaborate on photo book projects
-- ========================================

-- Collaborator roles for photo book projects
CREATE TYPE photo_book_collaborator_role AS ENUM ('owner', 'editor', 'viewer');

-- Activity types for tracking changes
CREATE TYPE photo_book_activity_type AS ENUM (
  'created',
  'photo_added',
  'photo_removed',
  'photo_edited',
  'page_created',
  'page_edited',
  'page_deleted',
  'page_reordered',
  'cover_edited',
  'layout_regenerated',
  'text_added',
  'text_edited',
  'text_removed',
  'collaborator_added',
  'collaborator_removed',
  'project_published'
);

-- ========================================
-- Collaborators Table
-- ========================================
CREATE TABLE photo_book_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES photo_book_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role photo_book_collaborator_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A user can only be a collaborator once per project
  UNIQUE(project_id, user_id)
);

-- ========================================
-- Activity Log Table
-- ========================================
CREATE TABLE photo_book_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES photo_book_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type photo_book_activity_type NOT NULL,
  target_id UUID, -- ID of affected resource (photo, page, etc)
  metadata JSONB DEFAULT '{}', -- Additional context (photo name, text content, etc)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- Active Sessions (Presence)
-- ========================================
CREATE TABLE photo_book_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES photo_book_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id UUID REFERENCES photo_book_pages(id) ON DELETE SET NULL,
  cursor_position JSONB, -- {x, y, page_number}
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One session per user per project
  UNIQUE(project_id, user_id)
);

-- ========================================
-- Indexes
-- ========================================
CREATE INDEX idx_photo_book_collaborators_project ON photo_book_collaborators(project_id);
CREATE INDEX idx_photo_book_collaborators_user ON photo_book_collaborators(user_id);
CREATE INDEX idx_photo_book_collaborators_role ON photo_book_collaborators(role);

CREATE INDEX idx_photo_book_activity_project ON photo_book_activity(project_id, created_at DESC);
CREATE INDEX idx_photo_book_activity_user ON photo_book_activity(user_id);
CREATE INDEX idx_photo_book_activity_type ON photo_book_activity(activity_type);

CREATE INDEX idx_photo_book_sessions_project ON photo_book_sessions(project_id);
CREATE INDEX idx_photo_book_sessions_heartbeat ON photo_book_sessions(last_heartbeat);

-- ========================================
-- Triggers
-- ========================================

-- Update timestamp on collaborator changes
CREATE TRIGGER update_photo_book_collaborators_updated_at
  BEFORE UPDATE ON photo_book_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Automatically create owner collaborator on project creation
CREATE OR REPLACE FUNCTION create_project_owner_collaborator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO photo_book_collaborators (project_id, user_id, role, invited_by, accepted_at)
  VALUES (NEW.id, NEW.user_id, 'owner', NEW.user_id, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_owner_collaborator_trigger
  AFTER INSERT ON photo_book_projects
  FOR EACH ROW
  EXECUTE FUNCTION create_project_owner_collaborator();

-- Log project creation activity
CREATE OR REPLACE FUNCTION log_project_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO photo_book_activity (project_id, user_id, activity_type, metadata)
  VALUES (NEW.id, NEW.user_id, 'created', jsonb_build_object('title', NEW.title));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_project_creation_trigger
  AFTER INSERT ON photo_book_projects
  FOR EACH ROW
  EXECUTE FUNCTION log_project_creation();

-- Clean up stale sessions (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM photo_book_sessions
  WHERE last_heartbeat < now() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Row Level Security (RLS)
-- ========================================

ALTER TABLE photo_book_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_book_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_book_sessions ENABLE ROW LEVEL SECURITY;

-- Collaborators: Users can see collaborators for projects they're part of
CREATE POLICY select_photo_book_collaborators ON photo_book_collaborators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM photo_book_collaborators pc
      WHERE pc.project_id = photo_book_collaborators.project_id
        AND pc.user_id = auth.uid()
        AND pc.accepted_at IS NOT NULL
    )
  );

-- Collaborators: Owners and editors can add collaborators
CREATE POLICY insert_photo_book_collaborators ON photo_book_collaborators
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM photo_book_collaborators pc
      WHERE pc.project_id = photo_book_collaborators.project_id
        AND pc.user_id = auth.uid()
        AND pc.role IN ('owner', 'editor')
        AND pc.accepted_at IS NOT NULL
    )
  );

-- Collaborators: Owners can update roles, users can accept invites
CREATE POLICY update_photo_book_collaborators ON photo_book_collaborators
  FOR UPDATE
  USING (
    -- Owners can update any collaborator
    EXISTS (
      SELECT 1 FROM photo_book_collaborators pc
      WHERE pc.project_id = photo_book_collaborators.project_id
        AND pc.user_id = auth.uid()
        AND pc.role = 'owner'
        AND pc.accepted_at IS NOT NULL
    )
    OR
    -- Users can accept their own invitations
    (user_id = auth.uid() AND accepted_at IS NULL)
  );

-- Collaborators: Owners can remove, users can remove themselves
CREATE POLICY delete_photo_book_collaborators ON photo_book_collaborators
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM photo_book_collaborators pc
      WHERE pc.project_id = photo_book_collaborators.project_id
        AND pc.user_id = auth.uid()
        AND pc.role = 'owner'
        AND pc.accepted_at IS NOT NULL
    )
  );

-- Activity: Collaborators can read activity logs
CREATE POLICY select_photo_book_activity ON photo_book_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM photo_book_collaborators pc
      WHERE pc.project_id = photo_book_activity.project_id
        AND pc.user_id = auth.uid()
        AND pc.accepted_at IS NOT NULL
    )
  );

-- Activity: All collaborators can create activity logs
CREATE POLICY insert_photo_book_activity ON photo_book_activity
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM photo_book_collaborators pc
      WHERE pc.project_id = photo_book_activity.project_id
        AND pc.user_id = auth.uid()
        AND pc.accepted_at IS NOT NULL
    )
  );

-- Sessions: Collaborators can see all active sessions
CREATE POLICY select_photo_book_sessions ON photo_book_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM photo_book_collaborators pc
      WHERE pc.project_id = photo_book_sessions.project_id
        AND pc.user_id = auth.uid()
        AND pc.accepted_at IS NOT NULL
    )
  );

-- Sessions: Users can manage their own sessions
CREATE POLICY manage_photo_book_sessions ON photo_book_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- Helper Functions
-- ========================================

-- Check if user can edit project
CREATE OR REPLACE FUNCTION can_edit_photo_book_project(project_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM photo_book_collaborators
    WHERE project_id = project_id_param
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
      AND accepted_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can view project
CREATE OR REPLACE FUNCTION can_view_photo_book_project(project_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM photo_book_collaborators
    WHERE project_id = project_id_param
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active collaborators for a project
CREATE OR REPLACE FUNCTION get_active_collaborators(project_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role photo_book_collaborator_role,
  last_seen_at TIMESTAMPTZ,
  is_online BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.user_id,
    u.email,
    pc.role,
    pc.last_seen_at,
    EXISTS (
      SELECT 1 FROM photo_book_sessions ps
      WHERE ps.project_id = project_id_param
        AND ps.user_id = pc.user_id
        AND ps.last_heartbeat > now() - INTERVAL '2 minutes'
    ) as is_online
  FROM photo_book_collaborators pc
  JOIN auth.users u ON u.id = pc.user_id
  WHERE pc.project_id = project_id_param
    AND pc.accepted_at IS NOT NULL
  ORDER BY pc.role DESC, u.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Comments
-- ========================================
COMMENT ON TABLE photo_book_collaborators IS 'PB-029: Stores collaborators for photo book projects with role-based permissions';
COMMENT ON TABLE photo_book_activity IS 'PB-029: Activity log for tracking all changes to photo book projects';
COMMENT ON TABLE photo_book_sessions IS 'PB-029: Real-time presence tracking for active collaborators';
