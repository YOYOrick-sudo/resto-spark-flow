ALTER TABLE public.marketing_popup_config 
ADD COLUMN featured_ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL;