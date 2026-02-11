

# docs/design/SETTINGS_LIST_PATTERNS.md

Een nieuw design-document dat de twee bestaande lijstpatronen formaliseert, plus een derde "compound" patroon voor nesting.

## Drie patronen

### Patroon 1: Flat Table
Eenregelige rijen met vaste kolomheaders, read-only data, bewerking via modal/wizard. Voorbeeld: ShiftsTable (shifts), SortableTableRow (tafels binnen een area).

### Patroon 2: Collapsible Card
Individuele NestoCards met collapsed samenvatting en expanded inline formulier. Voorbeeld: PhaseConfigCard (onboarding fasen).

### Patroon 3: Compound (nieuw)
Een Collapsible Card die een Flat Table als child bevat. De parent card beheert de context (naam, beschrijving, instellingen), de geneste tabel beheert de child-items. Voorbeelden: AreaCard (area + tafels), PhaseConfigCard (fase + taken via TaskTemplateList).

## Besliscriteria

Een tabel en beslisboom die bepaalt welk patroon past op basis van:
- Aantal bewerkbare velden per item (weinig = Flat Table, veel = Collapsible Card)
- Heeft child-items? Ja = Compound
- Past alle info in max 6 kolommen? Ja = Flat Table
- Bewerkfrequentie (laag = Flat Table, hoog = Collapsible Card)

## Gedeelde visuele elementen

Alle tokens die identiek moeten zijn in alle drie patronen:
- Headers: `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider`
- Row dividers: `divide-y divide-border/50`
- Hover: `hover:bg-accent/40 transition-colors duration-150`
- Actions: hover-reveal `opacity-0 group-hover:opacity-100`
- Drag handle: `GripVertical h-3.5 w-3.5`
- Input focus: `border-[1.5px] focus:!border-primary focus:ring-0`
- Footer actie: `NestoButton variant="outline" size="sm"` met Plus-icoon
- Archived sectie: Collapsible met `bg-muted/30`

## Nesting sectie (compound patroon)

Beschrijft de structurele regels voor Flat Table binnen Collapsible Card:
- Parent card header toont samenvatting (count, capacity)
- Expanded state onthult inline formuliervelden + een `border-t` scheiding + de geneste Flat Table
- De geneste tabel heeft eigen kolomheaders (zelfde styling als top-level Flat Table)
- DnD werkt op beide niveaus: cards onderling EN rijen binnen een card
- Concrete voorbeelden: AreaCard met SortableTableRow, PhaseConfigCard met TaskTemplateList

## Module-toewijzingstabel

| Module | Patroon | Reden |
|--------|---------|-------|
| Shifts | Flat Table | Alle info past in kolommen |
| Onboarding fasen | Compound | Fase-instellingen + takenlijst |
| Areas/Tafels | Compound | Area-instellingen + tafelrijen |
| Tickets | Flat Table | Naam, prijs, capaciteit |
| Email templates | Collapsible Card | Body-editor, variabelen |
| Tafelgroepen | Flat Table | Naam + toewijzing |
| Team rollen | Flat Table | Naam, permissies, toggle |
| Menu categorieen + gerechten | Compound | Categorie expand, gerechten als rijen |
| Leveranciers + producten | Compound | Contactgegevens + productlijst |
| Reminders | Flat Table | Timing, trigger, kanaal |

## Checklists

Per patroon een implementatie-checklist (vergelijkbaar met INLINE_DATA_TABLES.md).

## Cross-referenties

Links naar INLINE_DATA_TABLES.md, ENTERPRISE_DESIGN_GUIDE.md, en COLLAPSIBLE_SETTINGS_CARDS pattern.

## Technisch

Alleen een nieuw Markdown-bestand: `docs/design/SETTINGS_LIST_PATTERNS.md`. Daarnaast een verwijzing toevoegen in de Detail-documenten Index van `ENTERPRISE_DESIGN_GUIDE.md`.

