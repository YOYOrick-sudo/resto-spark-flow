
-- The view was created in the failed migration without security_invoker
-- Recreate with explicit security_invoker = true
DROP VIEW IF EXISTS public.shift_risk_summary;
CREATE VIEW public.shift_risk_summary
WITH (security_invoker = true)
AS
SELECT
  r.location_id,
  r.shift_id,
  r.reservation_date,
  COUNT(*) AS total_reservations,
  SUM(r.party_size) AS total_covers,
  ROUND(AVG(r.no_show_risk_score), 1) AS avg_risk_score,
  COUNT(*) FILTER (WHERE r.no_show_risk_score >= 50) AS high_risk_count,
  SUM(r.party_size) FILTER (WHERE r.no_show_risk_score >= 50) AS high_risk_covers
FROM public.reservations r
WHERE r.status IN ('confirmed', 'option', 'pending_payment')
GROUP BY r.location_id, r.shift_id, r.reservation_date;
