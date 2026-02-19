

# Verwijder expand/collapse uit "Niet toegewezen" rij

## Wat verandert

De chevron-knop en het inklapbare gedrag van de "Niet toegewezen" rij worden verwijderd. De rij blijft altijd zichtbaar staan (zoals de gebruiker wil).

## Technische wijzigingen

### `src/components/reserveringen/ReservationGridView.tsx`

1. **Verwijder Collapsible wrapper** (regels 316, 366): De `<Collapsible>` en `</Collapsible>` tags worden verwijderd. De content wordt altijd getoond.

2. **Verwijder CollapsibleTrigger** (regel 326-330): Vervang door een gewone `div` met dezelfde styling, maar zonder de chevron-iconen. Tekst "Niet toegew." en de count-badge blijven.

3. **Verwijder CollapsibleContent** (regel 335, 362): De wrapper `<CollapsibleContent forceMount>` wordt verwijderd, de inhoud (reservation blocks) blijft direct staan.

4. **State opruimen** (regel 291): Verwijder `const [open, setOpen] = useState(true);`

5. **Imports opruimen**: Verwijder `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` als ze nergens anders in het bestand worden gebruikt. `ChevronUp` en `ChevronDown` ook verwijderen als ze nu nergens meer nodig zijn.

Totaal: 1 bestand, ~15 regels aangepast/verwijderd.

