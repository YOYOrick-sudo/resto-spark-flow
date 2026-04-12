
DROP POLICY IF EXISTS "voorraad_bewegingen_insert" ON public.voorraad_bewegingen;

CREATE POLICY "voorraad_bewegingen_insert" ON public.voorraad_bewegingen
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ingredienten i
      WHERE i.id = voorraad_bewegingen.ingredient_id
        AND i.location_id IN (
          SELECT ulr.location_id FROM public.user_location_roles ulr
          WHERE ulr.user_id = (SELECT auth.uid())
            AND ulr.role = ANY(ARRAY['owner','manager','kitchen']::public.location_role[])
        )
    )
  );
