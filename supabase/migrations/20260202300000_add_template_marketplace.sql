-- ==============================================
-- Template Marketplace Schema Migration
-- ==============================================
-- Creates tables for photo book template marketplace
-- @see PB-035: Template Marketplace
-- Dependencies: 20260121000010_add_photo_book_schema.sql

-- Photo book templates table (marketplace templates)
CREATE TABLE IF NOT EXISTS public.photo_book_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'classic', -- classic, collage, magazine, minimalist, seasonal

  -- Marketplace settings
  is_marketplace BOOLEAN DEFAULT false, -- Whether template appears in marketplace
  type VARCHAR(20) DEFAULT 'free', -- free or premium (derived from price)
  price DECIMAL(10, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Template assets
  thumbnail TEXT, -- URL to thumbnail image
  preview_images TEXT[] DEFAULT '{}', -- Array of preview image URLs
  template_data JSONB, -- Template layout configuration

  -- Ratings and usage
  rating DECIMAL(3, 2) DEFAULT 0.00, -- Average rating (0-5)
  review_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_category CHECK (category IN ('classic', 'collage', 'magazine', 'minimalist', 'seasonal', 'all')),
  CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5),
  CONSTRAINT valid_price CHECK (price >= 0)
);

-- Template purchases table
CREATE TABLE IF NOT EXISTS public.template_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.photo_book_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Payment info
  payment_intent_id VARCHAR(255), -- Stripe payment intent ID
  price_paid DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Timestamps
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate purchases
  UNIQUE(template_id, user_id)
);

-- Template usage table (for free templates)
CREATE TABLE IF NOT EXISTS public.template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.photo_book_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template reviews table
CREATE TABLE IF NOT EXISTS public.template_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.photo_book_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One review per user per template
  UNIQUE(template_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_photo_book_templates_marketplace ON public.photo_book_templates(is_marketplace) WHERE is_marketplace = true;
CREATE INDEX IF NOT EXISTS idx_photo_book_templates_category ON public.photo_book_templates(category);
CREATE INDEX IF NOT EXISTS idx_photo_book_templates_rating ON public.photo_book_templates(rating DESC);
CREATE INDEX IF NOT EXISTS idx_photo_book_templates_downloads ON public.photo_book_templates(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_template_purchases_user ON public.template_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_template_reviews_template ON public.template_reviews(template_id);

-- Function: Increment template downloads
CREATE OR REPLACE FUNCTION public.increment_template_downloads(template_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.photo_book_templates
  SET download_count = download_count + 1,
      updated_at = NOW()
  WHERE id = template_id;
END;
$$;

-- Function: Update template average rating
CREATE OR REPLACE FUNCTION public.update_template_rating(template_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  avg_rating DECIMAL(3, 2);
  review_cnt INTEGER;
BEGIN
  -- Calculate average rating and count
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO avg_rating, review_cnt
  FROM public.template_reviews
  WHERE template_reviews.template_id = update_template_rating.template_id;

  -- Update template
  UPDATE public.photo_book_templates
  SET
    rating = avg_rating,
    review_count = review_cnt,
    updated_at = NOW()
  WHERE id = update_template_rating.template_id;
END;
$$;

-- Trigger: Auto-update template rating after review
CREATE OR REPLACE FUNCTION public.trigger_update_template_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.update_template_rating(NEW.template_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_template_rating_after_review
AFTER INSERT OR UPDATE OR DELETE ON public.template_reviews
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_template_rating();

-- RLS Policies
ALTER TABLE public.photo_book_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_reviews ENABLE ROW LEVEL SECURITY;

-- Templates: Everyone can view marketplace templates
CREATE POLICY "Anyone can view marketplace templates"
  ON public.photo_book_templates
  FOR SELECT
  USING (is_marketplace = true);

-- Purchases: Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON public.template_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

-- Purchases: Users can insert purchases
CREATE POLICY "Users can purchase templates"
  ON public.template_purchases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usage: Users can view their own usage
CREATE POLICY "Users can view own template usage"
  ON public.template_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usage: Users can record usage
CREATE POLICY "Users can record template usage"
  ON public.template_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Reviews: Everyone can view reviews
CREATE POLICY "Anyone can view reviews"
  ON public.template_reviews
  FOR SELECT
  USING (true);

-- Reviews: Users can create/update their own reviews
CREATE POLICY "Users can manage own reviews"
  ON public.template_reviews
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Seed some starter templates
INSERT INTO public.photo_book_templates (name, description, category, is_marketplace, price, thumbnail) VALUES
  ('Classic Elegance', 'Timeless photo book design with clean layouts', 'classic', true, 0.00, 'https://via.placeholder.com/800x600/4a5568/ffffff?text=Classic+Elegance'),
  ('Modern Collage', 'Dynamic multi-photo layouts for vibrant storytelling', 'collage', true, 0.00, 'https://via.placeholder.com/800x600/10b981/ffffff?text=Modern+Collage'),
  ('Magazine Style', 'Editorial-inspired layouts with bold typography', 'magazine', true, 9.99, 'https://via.placeholder.com/800x600/8b5cf6/ffffff?text=Magazine+Style'),
  ('Minimalist White', 'Clean, modern design with plenty of white space', 'minimalist', true, 0.00, 'https://via.placeholder.com/800x600/f3f4f6/1f2937?text=Minimalist+White'),
  ('Holiday Memories', 'Festive template perfect for seasonal photo books', 'seasonal', true, 4.99, 'https://via.placeholder.com/800x600/dc2626/ffffff?text=Holiday+Memories')
ON CONFLICT DO NOTHING;
