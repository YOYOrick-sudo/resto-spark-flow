
CREATE OR REPLACE FUNCTION public.validate_agent_configuration()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.autonomy_level NOT IN ('recommend', 'notify', 'autonomous') THEN
    RAISE EXCEPTION 'Invalid autonomy_level: %. Must be recommend, notify, or autonomous', NEW.autonomy_level;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_agent_action_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('concept', 'goedgekeurd', 'uitgevoerd', 'afgewezen', 'verlopen') THEN
    RAISE EXCEPTION 'Invalid agent action status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_agent_feedback_type()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.feedback_type NOT IN ('approved', 'rejected', 'corrected') THEN
    RAISE EXCEPTION 'Invalid feedback_type: %', NEW.feedback_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_knowledge_base_source()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.source NOT IN ('manual', 'wizard', 'gap_detection', 'import') THEN
    RAISE EXCEPTION 'Invalid knowledge_base source: %', NEW.source;
  END IF;
  RETURN NEW;
END;
$$;
