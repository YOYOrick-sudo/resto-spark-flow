
-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create marketing_email_log table
CREATE TABLE public.marketing_email_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  flow_id uuid REFERENCES public.marketing_automation_flows(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  resend_message_id text,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  bounce_type text,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for suppression queries and webhook lookups
CREATE INDEX idx_email_log_suppression ON public.marketing_email_log (customer_id, location_id, sent_at DESC);
CREATE INDEX idx_email_log_resend_id ON public.marketing_email_log (resend_message_id) WHERE resend_message_id IS NOT NULL;
CREATE INDEX idx_email_log_campaign ON public.marketing_email_log (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_email_log_flow ON public.marketing_email_log (flow_id) WHERE flow_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.marketing_email_log ENABLE ROW LEVEL SECURITY;

-- RLS policies: select for location members, no direct insert/update/delete from client (edge functions use service role)
CREATE POLICY "email_log_select" ON public.marketing_email_log
  FOR SELECT USING (user_has_location_access(auth.uid(), location_id));
