-- Update signals SELECT policy: voeg inkoop-mapping toe + role-filter voor inkoop signals
DROP POLICY IF EXISTS "Users can view signals for their location with enabled modules" ON public.signals;

CREATE POLICY "Users can view signals for their location with enabled modules"
ON public.signals FOR SELECT TO authenticated
USING (
  user_has_location_access(auth.uid(), location_id)
  AND EXISTS (
    SELECT 1 FROM public.location_entitlements le
    WHERE le.location_id = signals.location_id
      AND le.enabled = true
      AND (
        (signals.module = 'reserveringen' AND le.module_key = 'reservations')
        OR (signals.module = 'keuken'      AND le.module_key = 'kitchen')
        OR (signals.module = 'revenue'     AND le.module_key = 'finance')
        OR (signals.module = 'onboarding'  AND le.module_key = 'onboarding')
        OR (signals.module = 'configuratie' AND le.module_key = 'settings')
        OR (signals.module = 'inkoop'      AND le.module_key = 'inkoop')
      )
  )
  AND (
    signals.module <> 'inkoop'
    OR EXISTS (
      SELECT 1 FROM public.user_location_roles ulr
      WHERE ulr.user_id = auth.uid()
        AND ulr.location_id = signals.location_id
        AND ulr.role IN ('owner','manager','finance')
    )
  )
);