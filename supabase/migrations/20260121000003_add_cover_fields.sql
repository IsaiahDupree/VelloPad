-- Add cover design fields to books table
ALTER TABLE books
ADD COLUMN IF NOT EXISTS cover_background_color TEXT DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS cover_background_image_id UUID REFERENCES assets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cover_title_font_family TEXT DEFAULT 'Georgia',
ADD COLUMN IF NOT EXISTS cover_title_font_size INTEGER DEFAULT 48,
ADD COLUMN IF NOT EXISTS cover_title_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS cover_subtitle_font_family TEXT DEFAULT 'Georgia',
ADD COLUMN IF NOT EXISTS cover_subtitle_font_size INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS cover_subtitle_color TEXT DEFAULT '#333333',
ADD COLUMN IF NOT EXISTS cover_author_font_family TEXT DEFAULT 'Georgia',
ADD COLUMN IF NOT EXISTS cover_author_font_size INTEGER DEFAULT 18,
ADD COLUMN IF NOT EXISTS cover_author_color TEXT DEFAULT '#666666',
ADD COLUMN IF NOT EXISTS cover_layout TEXT DEFAULT 'centered',
ADD COLUMN IF NOT EXISTS interior_template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cover_template_id UUID REFERENCES templates(id) ON DELETE SET NULL;

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_books_interior_template ON books(interior_template_id) WHERE interior_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_cover_template ON books(cover_template_id) WHERE cover_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_cover_bg_image ON books(cover_background_image_id) WHERE cover_background_image_id IS NOT NULL;
