CREATE OR REPLACE FUNCTION public.process_waste_registratie()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_unit text;
  v_wpp numeric;
  v_density numeric;
  v_waste_base numeric;
BEGIN
  IF NEW.ingredient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT base_unit, weight_per_piece_g, density_g_per_ml
    INTO v_base_unit, v_wpp, v_density
  FROM public.ingredienten
  WHERE id = NEW.ingredient_id;

  IF v_base_unit IS NULL THEN
    RAISE EXCEPTION 'ingredient % heeft geen base_unit', NEW.ingredient_id;
  END IF;

  IF NEW.eenheid IS NULL THEN
    v_waste_base := NEW.hoeveelheid;
  ELSE
    v_waste_base := public.to_base_unit(
      NEW.hoeveelheid, NEW.eenheid, v_base_unit, v_wpp, v_density
    );
  END IF;

  IF v_waste_base IS NULL THEN
    RAISE EXCEPTION 'cannot convert waste % % -> base % for ingredient %',
      NEW.hoeveelheid, NEW.eenheid, v_base_unit, NEW.ingredient_id;
  END IF;

  INSERT INTO public.voorraad_bewegingen
    (ingredient_id, type, hoeveelheid, bron, referentie_type, referentie_id)
  VALUES
    (NEW.ingredient_id, 'WASTE', -v_waste_base,
     'Waste: ' || NEW.categorie, 'waste', NEW.id);

  UPDATE public.ingredienten
  SET voorraad = COALESCE(voorraad, 0) - v_waste_base,
      updated_at = now()
  WHERE id = NEW.ingredient_id;

  RETURN NEW;
END;
$function$;