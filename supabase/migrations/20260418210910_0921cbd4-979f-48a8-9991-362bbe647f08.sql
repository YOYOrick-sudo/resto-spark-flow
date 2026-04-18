-- 1. Enum
CREATE TYPE public.bestel_methode AS ENUM ('email','api','portal','handmatig');

-- 2. Kolommen
ALTER TABLE public.leveranciers 
  ADD COLUMN bestelmethode_default public.bestel_methode NOT NULL DEFAULT 'email';

ALTER TABLE public.bestellingen 
  ADD COLUMN bestelmethode public.bestel_methode NOT NULL DEFAULT 'email';

-- 3. Auto-copy default bij INSERT bestelling vanuit leverancier
CREATE OR REPLACE FUNCTION public.set_bestelmethode_from_leverancier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Alleen overschrijven als nog niet expliciet gezet (= default 'email')
  -- We pakken altijd de leverancier-default; frontend kan daarna nog overriden via UPDATE (met role-check)
  SELECT bestelmethode_default INTO NEW.bestelmethode
  FROM public.leveranciers
  WHERE id = NEW.leverancier_id;
  
  IF NEW.bestelmethode IS NULL THEN
    NEW.bestelmethode := 'email';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bestelling_methode_default
  BEFORE INSERT ON public.bestellingen
  FOR EACH ROW
  EXECUTE FUNCTION public.set_bestelmethode_from_leverancier();

-- 4. Role-gating trigger op bestellingen (column-level restriction)
CREATE OR REPLACE FUNCTION public.guard_bestelling_methode_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _loc uuid;
BEGIN
  IF NEW.bestelmethode IS DISTINCT FROM OLD.bestelmethode THEN
    _loc := COALESCE(NEW.location_id, OLD.location_id);
    IF auth.uid() IS NOT NULL 
       AND NOT public.user_has_role_in_location(
         auth.uid(), 
         _loc, 
         ARRAY['owner','manager','finance']::location_role[]
       ) THEN
      RAISE EXCEPTION 'Niet bevoegd: alleen owner, manager of finance mogen de bestelmethode wijzigen'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_bestelling_methode
  BEFORE UPDATE ON public.bestellingen
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_bestelling_methode_change();

-- 5. Role-gating trigger op leveranciers (default-veld)
CREATE OR REPLACE FUNCTION public.guard_leverancier_methode_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _loc uuid;
BEGIN
  IF NEW.bestelmethode_default IS DISTINCT FROM OLD.bestelmethode_default THEN
    _loc := COALESCE(NEW.location_id, OLD.location_id);
    IF auth.uid() IS NOT NULL
       AND NOT public.user_has_role_in_location(
         auth.uid(),
         _loc,
         ARRAY['owner','manager','finance']::location_role[]
       ) THEN
      RAISE EXCEPTION 'Niet bevoegd: alleen owner, manager of finance mogen de standaard bestelmethode wijzigen'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_leverancier_methode
  BEFORE UPDATE ON public.leveranciers
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_leverancier_methode_change();

-- 6. Audit-trail trigger op bestellingen
CREATE OR REPLACE FUNCTION public.audit_bestelling_methode_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.bestelmethode IS DISTINCT FROM OLD.bestelmethode THEN
    INSERT INTO public.audit_log (
      location_id, entity_type, entity_id, action, actor_id, actor_type, changes
    ) VALUES (
      NEW.location_id,
      'bestelling',
      NEW.id,
      'bestelmethode_changed',
      auth.uid(),
      'user',
      jsonb_build_object(
        'old', OLD.bestelmethode::text,
        'new', NEW.bestelmethode::text
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_bestelling_methode
  AFTER UPDATE ON public.bestellingen
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_bestelling_methode_change();

-- 7. Audit-trail trigger op leveranciers
CREATE OR REPLACE FUNCTION public.audit_leverancier_methode_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.bestelmethode_default IS DISTINCT FROM OLD.bestelmethode_default THEN
    INSERT INTO public.audit_log (
      location_id, entity_type, entity_id, action, actor_id, actor_type, changes
    ) VALUES (
      NEW.location_id,
      'leverancier',
      NEW.id,
      'bestelmethode_default_changed',
      auth.uid(),
      'user',
      jsonb_build_object(
        'old', OLD.bestelmethode_default::text,
        'new', NEW.bestelmethode_default::text
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_leverancier_methode
  AFTER UPDATE ON public.leveranciers
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_leverancier_methode_change();