-- VelloPad Initial Database Schema
-- DB-001: Database Schema - Core
-- Created: 2026-01-20

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & WORKSPACES
-- ============================================================================

-- Workspaces (multi-tenant organizations)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members and roles
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  default_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BOOKS
-- ============================================================================

-- Book genres
CREATE TYPE book_genre AS ENUM (
  'fiction',
  'non_fiction',
  'poetry',
  'memoir',
  'children',
  'young_adult',
  'academic',
  'cookbook',
  'other'
);

-- Trim sizes (in inches)
CREATE TYPE trim_size AS ENUM (
  '5x8',
  '5.5x8.5',
  '6x9',
  '7x10',
  '8x10',
  '8.5x11'
);

-- Binding types
CREATE TYPE binding_type AS ENUM (
  'perfect_bound',
  'case_bound',
  'saddle_stitch',
  'spiral',
  'wire_o'
);

-- Books
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  author TEXT,
  genre book_genre,
  trim_size trim_size NOT NULL DEFAULT '6x9',
  binding binding_type NOT NULL DEFAULT 'perfect_bound',
  isbn TEXT,

  -- Progress tracking
  word_count INTEGER DEFAULT 0,
  completion_percent INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- ============================================================================
-- BOOK STRUCTURE
-- ============================================================================

-- Chapters
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}', -- TipTap JSON content
  word_count INTEGER DEFAULT 0,
  position INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(book_id, position)
);

-- Sections (for organizing chapters)
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(book_id, position)
);

-- Link chapters to sections
ALTER TABLE chapters ADD COLUMN section_id UUID REFERENCES sections(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_books_workspace_id ON books(workspace_id);
CREATE INDEX idx_books_created_by ON books(created_by);
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_chapters_section_id ON chapters(section_id);
CREATE INDEX idx_sections_book_id ON sections(book_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Workspaces: Users can see workspaces they're members of
CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Workspace owners can update" ON workspaces
  FOR UPDATE USING (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Workspace members
CREATE POLICY "Users can view workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can manage members" ON workspace_members
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Profiles: Users can view all profiles, but only edit their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Books: Users can see books in their workspaces
CREATE POLICY "Users can view workspace books" ON books
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create books in their workspaces" ON books
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workspace books" ON books
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workspace books" ON books
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Chapters: Same as books
CREATE POLICY "Users can view chapters" ON chapters
  FOR SELECT USING (
    book_id IN (
      SELECT id FROM books
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage chapters" ON chapters
  FOR ALL USING (
    book_id IN (
      SELECT id FROM books
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Sections: Same as books
CREATE POLICY "Users can view sections" ON sections
  FOR SELECT USING (
    book_id IN (
      SELECT id FROM books
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage sections" ON sections
  FOR ALL USING (
    book_id IN (
      SELECT id FROM books
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspace_members_updated_at BEFORE UPDATE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Create default workspace on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create workspace
  INSERT INTO workspaces (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Workspace'),
    'workspace-' || NEW.id::TEXT
  )
  RETURNING id INTO new_workspace_id;

  -- Add user as owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  -- Create profile
  INSERT INTO profiles (id, email, full_name, default_workspace_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    new_workspace_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
