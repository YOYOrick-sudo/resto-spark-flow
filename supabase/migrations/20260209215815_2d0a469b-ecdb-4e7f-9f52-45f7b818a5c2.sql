
-- Add email_config JSONB column to onboarding_settings
ALTER TABLE public.onboarding_settings
ADD COLUMN IF NOT EXISTS email_config JSONB NOT NULL DEFAULT '{"sender_name": "", "reply_to": ""}'::jsonb;

-- Add reminder_enabled to existing reminder_config records that don't have it
UPDATE public.onboarding_settings
SET reminder_config = reminder_config || '{"reminder_enabled": true}'::jsonb
WHERE NOT (reminder_config ? 'reminder_enabled');
