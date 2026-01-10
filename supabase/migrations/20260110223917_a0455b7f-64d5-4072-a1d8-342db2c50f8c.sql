-- Add extra_seats column to table_groups
ALTER TABLE public.table_groups 
ADD COLUMN extra_seats integer NOT NULL DEFAULT 0;

-- Update trigger function to only add extra_seats to combined_max_capacity
CREATE OR REPLACE FUNCTION public.update_table_group_capacities()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.table_groups tg
  SET 
    combined_min_capacity = COALESCE((
      SELECT SUM(t.min_capacity)
      FROM public.table_group_members tgm
      JOIN public.tables t ON t.id = tgm.table_id AND t.is_active = true
      WHERE tgm.table_group_id = tg.id
    ), 0),
    combined_max_capacity = COALESCE((
      SELECT SUM(t.max_capacity)
      FROM public.table_group_members tgm
      JOIN public.tables t ON t.id = tgm.table_id AND t.is_active = true
      WHERE tgm.table_group_id = tg.id
    ), 0) + tg.extra_seats,
    updated_at = now()
  WHERE tg.id = COALESCE(NEW.table_group_id, OLD.table_group_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add trigger to recalculate when extra_seats changes on table_groups
CREATE OR REPLACE FUNCTION public.update_table_group_capacities_on_extra_seats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.extra_seats IS DISTINCT FROM OLD.extra_seats THEN
    NEW.combined_max_capacity := COALESCE((
      SELECT SUM(t.max_capacity)
      FROM public.table_group_members tgm
      JOIN public.tables t ON t.id = tgm.table_id AND t.is_active = true
      WHERE tgm.table_group_id = NEW.id
    ), 0) + NEW.extra_seats;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_table_group_on_extra_seats_change
  BEFORE UPDATE ON public.table_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_table_group_capacities_on_extra_seats();

-- Add constraints for capacity validation
ALTER TABLE public.table_groups 
ADD CONSTRAINT table_groups_max_capacity_positive 
CHECK (combined_max_capacity >= 1);

ALTER TABLE public.table_groups 
ADD CONSTRAINT table_groups_min_capacity_positive 
CHECK (combined_min_capacity >= 1);

ALTER TABLE public.table_groups 
ADD CONSTRAINT table_groups_capacity_order 
CHECK (combined_min_capacity <= combined_max_capacity);

-- Recalculate all existing groups to ensure consistency
UPDATE public.table_groups SET updated_at = now();