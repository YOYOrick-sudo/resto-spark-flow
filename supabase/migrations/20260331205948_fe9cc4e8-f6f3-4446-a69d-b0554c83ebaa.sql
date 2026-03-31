
-- 1. Convert dietary_preferences from text[] to jsonb
ALTER TABLE public.customers 
  ALTER COLUMN dietary_preferences DROP DEFAULT,
  ALTER COLUMN dietary_preferences TYPE jsonb USING 
    CASE 
      WHEN dietary_preferences IS NULL THEN NULL
      WHEN array_length(dietary_preferences, 1) IS NULL THEN NULL
      ELSE jsonb_build_object('allergies', to_jsonb(dietary_preferences))
    END,
  ALTER COLUMN dietary_preferences SET DEFAULT NULL;

-- 2. Add last_notification_at to conversations for email throttling
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS last_notification_at timestamptz;
