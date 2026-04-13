

# Twee fixes MEP Taken

## Wijziging 1: MepQuickAdd.tsx — handmatig invoer verwijderen

Verwijder de hele "Of voeg handmatig toe..." sectie (regels met `manualTitle`, `manualCategory`, `handleAddManual`, de flex container met NestoInput + NestoSelect + NestoButton). Alleen het zoek-invoerveld met dropdown resultaten blijft over.

State variabelen `manualTitle`, `manualCategory` en de `handleAddManual` functie worden ook verwijderd.

## Wijziging 2: useHalffabricaatSearch.ts — type filter

Voeg `.eq("type", "halffabricaat")` toe aan de query, na de `.eq("is_archived", false)` regel.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/components/mep/MepQuickAdd.tsx` | Verwijder handmatige invoer sectie + ongebruikte imports |
| `src/hooks/useHalffabricaatSearch.ts` | Voeg `.eq("type", "halffabricaat")` toe |

