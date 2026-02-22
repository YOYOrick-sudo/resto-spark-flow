
-- Sessie 3.5b: Leercyclus kolommen

-- marketing_brand_intelligence: stijlprofielen voor leercyclus
ALTER TABLE public.marketing_brand_intelligence
  ADD COLUMN IF NOT EXISTS review_response_profile TEXT,
  ADD COLUMN IF NOT EXISTS email_tone_profile TEXT;

-- marketing_reviews: bewaar originele AI response + track operator edits
ALTER TABLE public.marketing_reviews
  ADD COLUMN IF NOT EXISTS ai_original_response TEXT,
  ADD COLUMN IF NOT EXISTS operator_edited BOOLEAN NOT NULL DEFAULT false;
