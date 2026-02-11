

# Fix: dubbele fasen na reset

## Probleem

`useAllOnboardingPhases()` haalt **alle** fasen op, inclusief gearchiveerde (`is_active = false`). Na een reset worden de oude fasen gearchiveerd en 10 nieuwe aangemaakt, maar de UI toont ze allemaal -- dus dubbel.

## Oplossing

Voeg `.eq('is_active', true)` toe aan de query in `useAllOnboardingPhases.ts`. Er is geen feature in de huidige UI om inactieve fasen te togglen, dus er is geen reden om ze op te halen.

## Wijziging

| Bestand | Wat |
|---------|-----|
| `src/hooks/useAllOnboardingPhases.ts` | Filter toevoegen: `.eq('is_active', true)` |

Eenregelige fix, geen bijwerkingen.

