
UPDATE onboarding_phases
SET task_templates = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'task_type' IS NOT NULL THEN elem
      WHEN lower(elem->>'title') ~ '(bevestiging|email|sturen|herinnering|reminder|confirm)' 
        THEN elem || '{"task_type": "send_email"}'::jsonb
      ELSE elem || '{"task_type": "manual"}'::jsonb
    END
  )
  FROM jsonb_array_elements(task_templates) AS elem
)
WHERE jsonb_array_length(task_templates) > 0
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(task_templates) e
    WHERE e->>'task_type' IS NULL
  );
