

# Areas Settings — Design Polish

Visuele verbeteringen op de Areas settings pagina om te voldoen aan de Enterprise Design Guide (Linear/Stripe/Polar esthetiek). Functionaliteit en UX blijven exact hetzelfde.

## Gevonden design-issues

| # | Issue | Regel | Fix |
|---|-------|-------|-----|
| 1 | AreaCard header heeft `bg-muted/30` achtergrond + `border-b` | "Floating headers" -- geen achtergrondkleur, typografie doet het werk | Verwijder bg-muted/30, vervang border-b door subtiele `divide-y divide-border/50` op content |
| 2 | Tafel kolomkoppen gebruiken `text-xs` zonder uppercase/tracking | Enterprise tables: `text-[11px] font-semibold uppercase tracking-wider` | Update header row styling |
| 3 | Row hover is `hover:bg-muted/50` | Enterprise tables: `hover:bg-accent/40 transition-colors duration-150` | Corrigeer hover kleur |
| 4 | NestoSelect in header toont "Eerst..." (afgekapt) | Select breedte te krap (w-36) voor langste optie | Vergroot naar w-44 |
| 5 | Tabel rijen missen `divide-y divide-border/50` scheiding | Enterprise tables: rijen gescheiden door dividers, niet los zwevend | Wrap tabelrijen in `divide-y divide-border/50` container |
| 6 | Add-knoppen ("+ Tafel", "+ Meerdere") staan los onderaan | Enterprise: subtielere inline-actie met `text-muted-foreground` stijl | Verplaats naar een nettere `border-t border-border/40` footer |
| 7 | Archived section collapsible trigger padding inconsistent | Enterprise: compact density `py-2.5 px-3` | Consistente padding |
| 8 | AreaCard header padding is p-4, content ook p-4 | NestoCard default is p-6 maar card heeft `overflow-hidden` en eigen padding -- content padding moet matchen | Standaardiseer naar px-5 py-4 voor header, px-5 pb-5 voor content |
| 9 | DragOverlay area card heeft `bg-muted/30` | Consistent met fix 1: verwijder achtergrond | Schone overlay |

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/settings/tables/AreaCard.tsx` | Header styling (geen bg), kolomkoppen enterprise-stijl, row dividers, footer styling, select breedte, padding |
| `src/components/settings/tables/SortableTableRow.tsx` | Hover kleur naar `hover:bg-accent/40`, verwijder rounded-lg van rij (dividers doen het werk) |
| `src/components/settings/tables/AreasSection.tsx` | DragOverlay styling, archived section padding |

## Technische details per bestand

### AreaCard.tsx
- Header: `p-4 border-b bg-muted/30` wordt `px-5 py-3.5` (geen border-b, geen bg)
- Kolomkoppen: `text-xs text-muted-foreground` wordt `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider`
- Kolomheader `border-b` wordt `pb-2` (floating, geen border)
- Content wrapper: `p-4 space-y-2` wordt `px-5 pb-5 pt-3`
- Tabel rijen wrapper: voeg `divide-y divide-border/50` toe
- Add-knoppen sectie: `flex gap-2 pt-2` wordt `flex gap-2 pt-3 border-t border-border/40 mt-1`
- NestoSelect breedte: `w-36` wordt `w-44`
- Empty state: verfijn padding

### SortableTableRow.tsx
- Verwijder `rounded-lg` van de rij (dividers scheiden nu)
- Hover: `hover:bg-muted/50` wordt `hover:bg-accent/40`
- Transition: behoudt `transition-colors` (al 150ms default)

### AreasSection.tsx
- DragOverlay: verwijder `bg-muted/30` uit de header div
- Archived section: padding consistent met compact density

## Wat NIET wijzigt
- Geen UX wijzigingen (collapse, DnD, sorting, modals, actions)
- Geen structuur/layout wijzigingen
- Geen nieuwe componenten
- Archived section behoudt `bg-muted/30 rounded-lg` (correct per design rules voor gearchiveerde/secundaire content)

