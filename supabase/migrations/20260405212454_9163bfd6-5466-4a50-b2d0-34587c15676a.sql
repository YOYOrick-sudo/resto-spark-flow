
CREATE OR REPLACE FUNCTION public.increment_knowledge_hit(question_text text, loc_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE knowledge_base
  SET hit_count = COALESCE(hit_count, 0) + 1,
      updated_at = now()
  WHERE location_id = loc_id
    AND question = question_text
    AND source = 'gap_detection';

  IF NOT FOUND THEN
    INSERT INTO knowledge_base (location_id, category, question, answer, source, is_active, hit_count)
    VALUES (loc_id, 'onbeantwoord', question_text, '', 'gap_detection', false, 1);
  END IF;
END;
$$;
