

# Fix: Highlight animatie stopt niet

## Probleem

`animate-pulse` in Tailwind is een **oneindige** animatie. De reserveringsrij knippert continu blauw zolang `isHighlighted` true is. Hoewel `highlightId` na 2.5 seconden op `null` wordt gezet, voelt de animatie flashy en agressief aan.

## Oplossing

Vervang `animate-pulse` door een zachte eenmalige fade-out animatie:

1. **Tailwind config**: Voeg een `highlight-fade` keyframe toe die één keer speelt — begint met `bg-primary/10` en faded naar transparant over 2 seconden.

2. **ReservationListView.tsx** (regel 421): Vervang `animate-pulse bg-primary/10` door `animate-highlight-fade` — een eenmalige, subtiele achtergrondkleur die vanzelf verdwijnt.

3. **Reserveringen.tsx**: De `setTimeout` voor `setHighlightId(null)` kan op 2.5s blijven als cleanup, maar de animatie zelf stopt visueel na één cyclus.

## Bestanden

| Bestand | Actie |
|---|---|
| `tailwind.config.ts` | Voeg `highlight-fade` keyframe + animatie toe (eenmalig, 2s) |
| `src/components/reserveringen/ReservationListView.tsx` | Regel 421: `animate-pulse bg-primary/10` → `animate-highlight-fade` |

