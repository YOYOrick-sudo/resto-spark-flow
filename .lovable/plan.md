

# Takenbox samenvoegen met Overzicht

## Wat verandert

De Takenbox tab verdwijnt. De pending agent_actions met goedkeuren/afwijzen knoppen worden inline getoond in de "Actie nodig" sectie van de Overzicht tab — samen met escalaties en error signals.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/pages/Assistent.tsx` | Verwijder Takenbox tab + `NestoTabContent` blok. Verwijder `TaskboxTab` import. Tabs array: alleen `overzicht` en `berichten`. |
| `src/components/assistant/OverviewTab.tsx` | Pending actions worden nu inline getoond met Goedkeuren/Afwijzen knoppen (ipv navigatie naar takenbox). Importeer `approve`/`reject` mutaties uit `useAgentActions`. Sorteer urgente items: escalaties → pending actions → signals. Begroeting past zich aan: 4+ = "X zaken die aandacht nodig hebben:", escalatie = "Een gast wil je spreken:" |
| `src/components/assistant/TaskboxTab.tsx` | Kan verwijderd worden — niet meer gebruikt |

## Detail: OverviewTab pending actions rendering

De huidige pending actions in OverviewTab navigeren naar `/assistent?tab=takenbox`. Dit wordt vervangen door inline kaarten met:
- Titel + beschrijving + ✦ sparkle
- Goedkeuren knop (primary, sm) + Afwijzen knop (outline, sm)
- Dezelfde `approve.mutate()` / `reject.mutate()` logica als TaskboxTab gebruikte

De `useAgentActions` hook retourneert al `approve` en `reject` mutaties — die worden nu direct in OverviewTab aangeroepen.

