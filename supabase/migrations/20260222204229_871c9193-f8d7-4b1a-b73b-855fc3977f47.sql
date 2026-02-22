
ALTER TABLE public.marketing_popup_config
  ADD COLUMN popup_type TEXT NOT NULL DEFAULT 'newsletter'
    CHECK (popup_type IN ('reservation', 'newsletter', 'custom')),
  ADD COLUMN custom_button_url TEXT;
