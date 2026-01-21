-- ==============================================
-- VelloPad Photo Book Schema Migration
-- ==============================================
-- Creates tables for photo book projects
-- Dependencies: 20260121000001_add_workspaces.sql

-- Photo book projects table
CREATE TABLE IF NOT EXISTS public.photo_book_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Project metadata
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Photo Book',
  description TEXT,

  -- Photo book specifications
  page_size VARCHAR(50) NOT NULL DEFAULT '8x8', -- 8x8, 10x10, 12x12, 8x11
  binding_type VARCHAR(50) NOT NULL DEFAULT 'hardcover', -- hardcover, softcover, layflat
  cover_finish VARCHAR(50), -- matte, glossy, linen
  page_count INTEGER DEFAULT 20, -- Will be calculated based on photos

  -- Template and layout
  template_id UUID, -- References template if used
  layout_style VARCHAR(50) DEFAULT 'classic', -- classic, collage, magazine, minimalist
  auto_layout_enabled BOOLEAN DEFAULT true,

  -- Photo organization
  photo_count INTEGER DEFAULT 0,
  total_file_size BIGINT DEFAULT 0, -- In bytes

  -- Status and completion
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, ready, generating, completed, error
  progress_percent INTEGER DEFAULT 0,

  -- Cover design
  cover_image_id UUID, -- Reference to asset
  cover_title VARCHAR(255),
  cover_subtitle VARCHAR(255),
  cover_author VARCHAR(255),

  -- Generation
  generated_pdf_url TEXT,
  generated_pdf_size BIGINT,
  generated_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_page_size CHECK (page_size IN ('8x8', '10x10', '12x12', '8x11', 'A4', 'letter')),
  CONSTRAINT valid_binding CHECK (binding_type IN ('hardcover', 'softcover', 'layflat', 'spiral')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'ready', 'generating', 'completed', 'error')),
  CONSTRAINT valid_progress CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

-- Photo book photos table (uploaded images)
CREATE TABLE IF NOT EXISTS public.photo_book_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.photo_book_projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Asset reference
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,

  -- Photo metadata
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  storage_url TEXT NOT NULL,

  -- Image properties
  width INTEGER,
  height INTEGER,
  aspect_ratio DECIMAL(10, 4),
  orientation VARCHAR(20), -- portrait, landscape, square

  -- EXIF metadata
  date_taken TIMESTAMP WITH TIME ZONE,
  camera_make VARCHAR(100),
  camera_model VARCHAR(100),
  location_name VARCHAR(255),
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),

  -- Print quality
  dpi INTEGER,
  is_print_safe BOOLEAN DEFAULT true,
  quality_warnings TEXT[],

  -- Organization
  sort_order INTEGER NOT NULL DEFAULT 0,
  tags TEXT[],
  caption TEXT,

  -- Processing
  thumbnail_url TEXT,
  optimized_url TEXT,
  processed BOOLEAN DEFAULT false,

  -- Timestamps
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photo book pages table (layout data)
CREATE TABLE IF NOT EXISTS public.photo_book_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.photo_book_projects(id) ON DELETE CASCADE,

  -- Page properties
  page_number INTEGER NOT NULL,
  page_type VARCHAR(50) NOT NULL DEFAULT 'content', -- cover, content, back

  -- Layout configuration
  layout_template VARCHAR(50), -- single, double, grid-2x2, grid-3x3, custom
  layout_json JSONB, -- Complete layout specification

  -- Photos on this page
  photo_ids UUID[],

  -- Text overlays
  text_elements JSONB, -- Array of text elements with position, style, content

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(project_id, page_number)
);

-- Photo book processing jobs
CREATE TABLE IF NOT EXISTS public.photo_book_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.photo_book_projects(id) ON DELETE CASCADE,

  -- Job details
  job_type VARCHAR(50) NOT NULL, -- optimize, generate_pdf, generate_preview
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed

  -- Progress
  progress_percent INTEGER DEFAULT 0,
  current_step VARCHAR(255),

  -- Results
  result_url TEXT,
  error_message TEXT,

  -- Metrics
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_job_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_job_type CHECK (job_type IN ('optimize', 'generate_pdf', 'generate_preview', 'auto_layout'))
);

-- Create indexes for performance
CREATE INDEX idx_photo_book_projects_workspace ON public.photo_book_projects(workspace_id);
CREATE INDEX idx_photo_book_projects_user ON public.photo_book_projects(user_id);
CREATE INDEX idx_photo_book_projects_status ON public.photo_book_projects(status);
CREATE INDEX idx_photo_book_projects_created ON public.photo_book_projects(created_at DESC);

CREATE INDEX idx_photo_book_photos_project ON public.photo_book_photos(project_id);
CREATE INDEX idx_photo_book_photos_workspace ON public.photo_book_photos(workspace_id);
CREATE INDEX idx_photo_book_photos_sort ON public.photo_book_photos(project_id, sort_order);
CREATE INDEX idx_photo_book_photos_date ON public.photo_book_photos(date_taken);

CREATE INDEX idx_photo_book_pages_project ON public.photo_book_pages(project_id, page_number);

CREATE INDEX idx_photo_book_jobs_project ON public.photo_book_jobs(project_id);
CREATE INDEX idx_photo_book_jobs_status ON public.photo_book_jobs(status);

-- Enable Row Level Security
ALTER TABLE public.photo_book_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_book_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_book_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_book_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photo_book_projects
CREATE POLICY "Users can view projects in their workspace"
  ON public.photo_book_projects FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects in their workspace"
  ON public.photo_book_projects FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own projects"
  ON public.photo_book_projects FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own projects"
  ON public.photo_book_projects FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for photo_book_photos
CREATE POLICY "Users can view photos in their workspace"
  ON public.photo_book_photos FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload photos to their projects"
  ON public.photo_book_photos FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own photos"
  ON public.photo_book_photos FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own photos"
  ON public.photo_book_photos FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for photo_book_pages
CREATE POLICY "Users can view pages in their workspace projects"
  ON public.photo_book_pages FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.photo_book_projects
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can modify pages in their projects"
  ON public.photo_book_pages FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.photo_book_projects
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for photo_book_jobs
CREATE POLICY "Users can view jobs for their projects"
  ON public.photo_book_jobs FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.photo_book_projects
      WHERE user_id = auth.uid()
    )
  );

-- Functions
CREATE OR REPLACE FUNCTION update_photo_book_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_photo_book_projects_updated_at
  BEFORE UPDATE ON public.photo_book_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_book_updated_at();

CREATE TRIGGER update_photo_book_photos_updated_at
  BEFORE UPDATE ON public.photo_book_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_book_updated_at();

CREATE TRIGGER update_photo_book_pages_updated_at
  BEFORE UPDATE ON public.photo_book_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_book_updated_at();

CREATE TRIGGER update_photo_book_jobs_updated_at
  BEFORE UPDATE ON public.photo_book_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_book_updated_at();

-- Function to update project photo count
CREATE OR REPLACE FUNCTION update_project_photo_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.photo_book_projects
    SET
      photo_count = photo_count + 1,
      total_file_size = total_file_size + NEW.file_size
    WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.photo_book_projects
    SET
      photo_count = GREATEST(0, photo_count - 1),
      total_file_size = GREATEST(0, total_file_size - OLD.file_size)
    WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_photo_count_trigger
  AFTER INSERT OR DELETE ON public.photo_book_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_project_photo_count();

-- Comments
COMMENT ON TABLE public.photo_book_projects IS 'Photo book projects with layout and design settings';
COMMENT ON TABLE public.photo_book_photos IS 'Uploaded photos for photo book projects';
COMMENT ON TABLE public.photo_book_pages IS 'Individual pages with layout and photo placements';
COMMENT ON TABLE public.photo_book_jobs IS 'Background jobs for processing photo books';
