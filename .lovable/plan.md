

# Verwijder expand/collapse knop uit Pacing-rij

## Wat verandert

De chevron-knop (expand/collapse) in de Pacing-rij heeft momenteel geen functie -- de rij toont altijd dezelfde inhoud ongeacht de `isExpanded` state. We verwijderen de knop en bijbehorende state.

## Technische wijzigingen

### `src/components/reserveringen/ReservationGridView.tsx`

1. **SeatedCountRow component (regels 122-189)**:
   - Verwijder `isExpanded` en `onToggle` uit de props
   - Verwijder de `<button>` met het chevron-icoon (regels 164-166)
   - Verander de sticky label-div van `justify-between` naar gewoon `items-center` (de tekst "Pacing" hoeft niet meer naar links geduwd te worden)

2. **SeatedCountRow aanroep (regels 581-588)**:
   - Verwijder `isExpanded={seatedExpanded}` en `onToggle={() => setSeatedExpanded(!seatedExpanded)}` props

3. **State opruimen (regel 424)**:
   - Verwijder `const [seatedExpanded, setSeatedExpanded] = useState(true);`

4. **Imports opruimen**:
   - Verwijder `ChevronUp` en `ChevronDown` als ze nergens anders worden gebruikt

