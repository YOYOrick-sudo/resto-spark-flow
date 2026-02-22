-- 1. Remove UNIQUE constraint on location_id to allow multiple popups per location
ALTER TABLE public.marketing_popup_config
  DROP CONSTRAINT marketing_popup_config_location_unique;

-- 2. Add name and priority columns
ALTER TABLE public.marketing_popup_config
  ADD COLUMN name TEXT NOT NULL DEFAULT 'Popup',
  ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;

-- 3. Add composite index for multi-popup queries
CREATE INDEX idx_popup_config_location_active 
  ON public.marketing_popup_config (location_id, is_active);
