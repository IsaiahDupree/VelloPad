-- UI-003: Editor Layout Mode
-- Add layout configuration to chapters for WYSIWYG page layout
-- Created: 2026-02-02

-- Add layout_config JSONB field to chapters
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{
  "margins": {
    "top": 1.0,
    "bottom": 1.0,
    "inside": 1.0,
    "outside": 0.75
  },
  "header": {
    "enabled": false,
    "height": 0.5,
    "content": "",
    "style": "plain"
  },
  "footer": {
    "enabled": false,
    "height": 0.5,
    "content": "",
    "style": "plain"
  },
  "pageNumbers": {
    "enabled": true,
    "position": "bottom-center",
    "format": "decimal"
  },
  "lineSpacing": 1.5,
  "fontSize": 11
}';

-- Add index for querying layout configs
CREATE INDEX IF NOT EXISTS idx_chapters_layout_config ON chapters USING GIN (layout_config);

-- Comment on the column
COMMENT ON COLUMN chapters.layout_config IS 'Layout configuration for chapter page layout including margins, headers, footers, and page numbers (in inches)';
