
-- Fix search_path on fn_validate_payment_status
CREATE OR REPLACE FUNCTION fn_validate_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status NOT IN ('none', 'pending', 'paid', 'expired', 'failed', 'canceled', 'refunded', 'partially_refunded') THEN
    RAISE EXCEPTION 'Invalid payment_status: %', NEW.payment_status;
  END IF;
  RETURN NEW;
END;
$$;
