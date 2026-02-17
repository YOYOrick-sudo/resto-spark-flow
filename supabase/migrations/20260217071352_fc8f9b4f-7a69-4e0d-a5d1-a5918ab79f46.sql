-- Drop the old AFTER INSERT trigger that conflicts with the new BEFORE INSERT trigger
DROP TRIGGER IF EXISTS trg_calculate_no_show_risk_after_insert ON public.reservations;
DROP FUNCTION IF EXISTS public.fn_calculate_no_show_risk_after_insert();
DROP FUNCTION IF EXISTS public.calculate_no_show_risk(uuid);