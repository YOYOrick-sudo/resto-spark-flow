-- Trigger ontbrekende dagelijkse checklist-runs voor vandaag.
-- Met name: 'Opening keuken template' (Pura Vida Daily) heeft geen run vandaag
-- terwijl de template actief is en 6 items heeft.
SELECT public.generate_daily_checklist_runs();