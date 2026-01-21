-- VelloPad Version Snapshots Schema
-- BS-205: Version Snapshots
-- Created: 2026-01-21

-- ============================================================================
-- VERSION SNAPSHOTS
-- ============================================================================

-- Snapshot types
CREATE TYPE snapshot_type AS ENUM (
  'manual',           -- User-triggered save
  'auto_milestone',   -- Automatic milestone (e.g., every 1000 words, chapter completion)
  'pre_restore'       -- Snapshot created before restoring another snapshot
);

-- Version snapshots table
CREATE TABLE version_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Snapshot metadata
  snapshot_type snapshot_type NOT NULL DEFAULT 'manual',
  label TEXT,  -- User-provided label for manual snapshots
  description TEXT,

  -- Book state at snapshot time
  book_data JSONB NOT NULL,  -- Full book metadata snapshot
  chapters_data JSONB NOT NULL,  -- All chapters with content

  -- Metrics at snapshot time
  word_count INTEGER NOT NULL,
  chapter_count INTEGER NOT NULL,
  completion_percent INTEGER NOT NULL,

  -- Milestone tracking
  milestone_name TEXT,  -- e.g., "First 1000 words", "Chapter 1 complete"

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_version_snapshots_book_id ON version_snapshots(book_id);
CREATE INDEX idx_version_snapshots_created_by ON version_snapshots(created_by);
CREATE INDEX idx_version_snapshots_created_at ON version_snapshots(created_at DESC);
CREATE INDEX idx_version_snapshots_type ON version_snapshots(snapshot_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE version_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can view snapshots for books in their workspace
CREATE POLICY "Users can view snapshots for their books" ON version_snapshots
  FOR SELECT USING (
    book_id IN (
      SELECT b.id FROM books b
      INNER JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Users can create snapshots for books they have access to
CREATE POLICY "Users can create snapshots" ON version_snapshots
  FOR INSERT WITH CHECK (
    book_id IN (
      SELECT b.id FROM books b
      INNER JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Users can delete their own manual snapshots
CREATE POLICY "Users can delete their own snapshots" ON version_snapshots
  FOR DELETE USING (
    created_by = auth.uid() AND
    book_id IN (
      SELECT b.id FROM books b
      INNER JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically create milestone snapshots
CREATE OR REPLACE FUNCTION create_milestone_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  milestone_label TEXT;
  should_create BOOLEAN := FALSE;
  last_snapshot_word_count INTEGER;
BEGIN
  -- Check if this is a significant milestone

  -- Milestone: First 1000 words
  IF NEW.word_count >= 1000 AND OLD.word_count < 1000 THEN
    should_create := TRUE;
    milestone_label := 'First 1000 words';
  END IF;

  -- Milestone: Every 5000 words
  IF NEW.word_count >= 5000 AND (NEW.word_count / 5000) > (OLD.word_count / 5000) THEN
    should_create := TRUE;
    milestone_label := FORMAT('%s words milestone', (NEW.word_count / 5000) * 5000);
  END IF;

  -- Milestone: 50% completion
  IF NEW.completion_percent >= 50 AND OLD.completion_percent < 50 THEN
    should_create := TRUE;
    milestone_label := '50% completion';
  END IF;

  -- Milestone: 100% completion
  IF NEW.completion_percent >= 100 AND OLD.completion_percent < 100 THEN
    should_create := TRUE;
    milestone_label := 'Book complete';
  END IF;

  -- Create the milestone snapshot if warranted
  IF should_create THEN
    INSERT INTO version_snapshots (
      book_id,
      created_by,
      snapshot_type,
      label,
      milestone_name,
      book_data,
      chapters_data,
      word_count,
      chapter_count,
      completion_percent
    )
    SELECT
      NEW.id,
      NEW.created_by,
      'auto_milestone',
      milestone_label,
      milestone_label,
      to_jsonb(NEW),
      COALESCE(
        (SELECT jsonb_agg(to_jsonb(c))
         FROM chapters c
         WHERE c.book_id = NEW.id
         ORDER BY c.position),
        '[]'::jsonb
      ),
      NEW.word_count,
      (SELECT COUNT(*) FROM chapters WHERE book_id = NEW.id),
      NEW.completion_percent;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create milestone snapshots on book updates
CREATE TRIGGER trigger_milestone_snapshots
  AFTER UPDATE ON books
  FOR EACH ROW
  WHEN (
    NEW.word_count != OLD.word_count OR
    NEW.completion_percent != OLD.completion_percent
  )
  EXECUTE FUNCTION create_milestone_snapshot();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE version_snapshots IS 'Stores version snapshots of books for restore functionality';
COMMENT ON COLUMN version_snapshots.snapshot_type IS 'Type of snapshot: manual, auto_milestone, or pre_restore';
COMMENT ON COLUMN version_snapshots.book_data IS 'Complete book metadata at snapshot time';
COMMENT ON COLUMN version_snapshots.chapters_data IS 'All chapter content at snapshot time';
COMMENT ON COLUMN version_snapshots.milestone_name IS 'Auto-generated milestone name for tracking progress';
