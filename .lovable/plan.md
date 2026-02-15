
# Sub-items dichter bij elkaar

## Wat verandert
De sub-items in de sidebar (bijv. MEP Taken, Halffabricaten, Recepten) krijgen iets minder verticale ruimte zodat ze dichter op elkaar staan.

## Technisch

**Bestand:** `src/components/layout/NestoSidebar.tsx`

| Locatie | Wijziging |
|---------|-----------|
| Regel 177 | `space-y-0.5` verwijderen (wordt `space-y-0`) |
| Regel 184 | Disabled sub-item: `py-1.5` wordt `py-1` |
| Regel 197 | Active sub-item: `py-1.5` wordt `py-1` |

Alleen de sub-items worden aangepast, de hoofditems behouden hun huidige spacing.
