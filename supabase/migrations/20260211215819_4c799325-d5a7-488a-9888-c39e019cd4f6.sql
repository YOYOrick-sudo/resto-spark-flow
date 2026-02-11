
-- Mark existing task templates with task_type 'send_email' or 'send_reminder' as is_system: true
-- Also mark any task that already has is_automated: true without a task_type as is_system: true
UPDATE onboarding_phases
SET task_templates = (
  SELECT jsonb_agg(
    CASE
      WHEN (elem->>'task_type') IN ('send_email', 'send_reminder')
        OR ((elem->>'is_automated')::boolean = true AND (elem->>'task_type') IS NULL)
      THEN elem || '{"is_system": true}'::jsonb
      ELSE elem || '{"is_system": false}'::jsonb
    END
  )
  FROM jsonb_array_elements(task_templates) AS elem
)
WHERE jsonb_array_length(task_templates) > 0;
