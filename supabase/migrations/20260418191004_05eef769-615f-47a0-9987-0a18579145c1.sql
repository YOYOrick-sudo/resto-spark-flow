INSERT INTO location_operating_exceptions
  (location_id, exception_date, exception_type, service_type, label, source)
SELECT 
  se.location_id, 
  se.exception_date, 
  'closed'::operating_exception_type,
  'general', 
  se.label, 
  'shift_migration'
FROM shift_exceptions se
WHERE se.shift_id IS NULL 
  AND se.exception_type = 'closed'
  AND NOT EXISTS (
    SELECT 1 FROM location_operating_exceptions loe
    WHERE loe.location_id = se.location_id
      AND loe.exception_date = se.exception_date
      AND loe.service_type = 'general'
      AND loe.exception_type = 'closed'
  );

DELETE FROM shift_exceptions WHERE shift_id IS NULL AND exception_type = 'closed';