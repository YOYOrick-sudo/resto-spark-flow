# SETTINGS LIST PATTERNS — Nesto Polar

> **Drie herbruikbare patronen voor bewerkbare lijsten in settings-pagina's.** Dit document formaliseert de bestaande implementaties en biedt keuzecriteria voor toekomstige modules.

---

## Overzicht

| # | Patroon | Kern | Voorbeeld |
|---|---------|------|-----------|
| 1 | **Flat Table** | Eenregelige rijen, kolomheaders, bewerking via modal | `ShiftsTable`, `SortableTableRow` |
| 2 | **Collapsible Card** | NestoCard met collapsed samenvatting, expanded inline formulier | `PhaseConfigCard` |
| 3 | **Compound** | Collapsible Card (parent) + Flat Table (children) | `AreaCard` + tafels, `PhaseConfigCard` + taken |

---

## Patroon 1: Flat Table

### Anatomie

```
┌─────────────────────────────────────────────────────────┐
│  ☰  #   Naam            Min   Max   Online   Grp   ⋮   │  ← Floating header
├─────────────────────────────────────────────────────────┤
│  ⠿  1   Tafel 1          2     4     ●        —    ⋮   │  ← Data row
│  ⠿  2   Tafel 2          2     6     ●        1    ⋮   │
│  ⠿  3   Tafel 3          4     8     ○        —    ⋮   │
├─────────────────────────────────────────────────────────┤
│  [+ Tafel toevoegen]                                    │  ← Footer actie
└─────────────────────────────────────────────────────────┘
```

### Kenmerken

- Vaste kolom grid (`grid-cols-[32px_40px_1fr_80px_80px_40px_48px_32px]`)
- Floating kolomheaders (geen achtergrond)
- Eenregelig per item — alle data zichtbaar zonder interactie
- Inline toggles (Switch) voor boolean velden
- Bewerken via modal of wizard (klik op rij of actie-menu)
- Optioneel: drag-and-drop voor volgorde (`useSortable`)
- Gearchiveerde items in collapsible sectie onderaan

### Wanneer gebruiken

- Alle relevante data past in **max 6 kolommen**
- Items zijn **read-only in de lijst** (behalve toggles)
- Bewerkfrequentie is **laag** (configureer en klaar)
- Geen child-items of geneste data

### Referentie-implementaties

- `ShiftsTable` — shifts overzicht
- `SortableTableRow` — tafels binnen een area
- `TableGroupCard` — tafelgroepen

---

## Patroon 2: Collapsible Card

### Anatomie

```
┌─────────────────────────────────────────────────────────┐
│  ▶  1. Fase naam          [Aangepast]    Actief  ●──    │  ← Collapsed
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ▼  1. Fase naam          [Aangepast]  🗑  Actief  ●──  │  ← Expanded header
│                                                         │
│  Fase naam     [___________________________]            │  ← Inline form
│  Beschrijving  [___________________________]            │
│                [___________________________]            │
│─────────────────────────────────────────────────────────│  ← border-t separator
│  TAKEN                                          3       │  ← Geneste sectie
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

### Kenmerken

- `NestoCard` per item met expand/collapse via chevron
- **Collapsed:** naam, status badges (`NestoBadge`), actief toggle
- **Expanded:** inline formuliervelden + optioneel geneste content
- Geen modal nodig — alles in-place bewerkbaar
- Debounced autosave op tekstvelden
- Optioneel: drag-and-drop op card-niveau (`useSortable`)

### Wanneer gebruiken

- Item heeft **4+ bewerkbare velden** die niet in kolommen passen
- Bewerkfrequentie is **hoog** (regelmatig bijsturen)
- Velden hebben **context nodig** (beschrijvingen, editors, previews)
- Geen child-items (anders → Compound)

### Referentie-implementaties

- `PhaseConfigCard` — onboarding fasen (ook Compound, zie onder)
- Toekomstig: email templates

---

## Patroon 3: Compound

### Anatomie

```
┌─────────────────────────────────────────────────────────┐
│  ⠿  ▼  Terras              4 tafels · 24 gasten   ●── │  ← Parent card header
│                                                         │
│  Naam          [Terras_____________________]            │  ← Parent inline form
│  Vul volgorde  [Evenredig ▼]                            │
│─────────────────────────────────────────────────────────│  ← border-t separator
│  TAFELS                                                 │
│  ☰  #   Naam        Min   Max   Online   Grp   ⋮       │  ← Geneste Flat Table
│  ⠿  1   Terras 1     2     4     ●        —    ⋮       │     (eigen headers)
│  ⠿  2   Terras 2     2     6     ●        —    ⋮       │
│  ⠿  3   Terras 3     4     8     ○        —    ⋮       │
│  [+ Tafel toevoegen]                                    │
└─────────────────────────────────────────────────────────┘
```

### Kenmerken

- **Parent:** Collapsible Card die context beheert (naam, beschrijving, instellingen)
- **Child:** Flat Table als geneste content binnen de expanded state
- Scheiding via `border-t border-border/40` tussen parent form en child tabel
- Geneste tabel heeft **eigen kolomheaders** (zelfde styling als top-level Flat Table)
- DnD werkt op **twee niveaus**: cards onderling EN rijen binnen een card

### Nesting-regels

| Regel | Beschrijving |
|-------|-------------|
| **Parent header** | Toont samenvatting in collapsed state: count + capacity (`4 tafels · 24 gasten`) |
| **Separator** | `border-t border-border/40 pt-4 mt-4` tussen parent form en geneste tabel |
| **Child headers** | Zelfde floating header styling als top-level Flat Table |
| **DnD scope** | Aparte `SortableContext` per nesting-niveau; parent en child sorteerbaar |
| **Footer** | Child tabel heeft eigen `[+ Item toevoegen]` footer |
| **Collapsed count** | Badge met child-count zichtbaar in collapsed header |
| **Max nesting** | Twee niveaus — geen Compound binnen Compound |

### Wanneer gebruiken

- Item is een **parent met child-items** (1:N relatie)
- Parent heeft eigen bewerkbare velden (naam, instellingen)
- Children passen in een Flat Table (max 6 kolommen per child)

### Referentie-implementaties

- `AreaCard` + `SortableTableRow` — area met tafels
- `PhaseConfigCard` + `TaskTemplateList` — fase met taken

---

## Beslisboom

```
Start
  │
  ├─ Heeft het item child-items (1:N relatie)?
  │   ├─ Ja → COMPOUND
  │   └─ Nee ↓
  │
  ├─ Past alle info in max 6 kolommen?
  │   ├─ Ja → FLAT TABLE
  │   └─ Nee ↓
  │
  ├─ Heeft het item 4+ bewerkbare velden?
  │   ├─ Ja → COLLAPSIBLE CARD
  │   └─ Nee → FLAT TABLE (met modal voor bewerking)
  │
  └─ Extra check: bewerkfrequentie hoog?
      ├─ Ja → COLLAPSIBLE CARD (inline bewerken)
      └─ Nee → FLAT TABLE (modal bewerken)
```

### Criteria-tabel

| Criterium | Flat Table | Collapsible Card | Compound |
|-----------|-----------|-----------------|----------|
| Velden per item | 3–6 kolommen | 4+ bewerkbare velden | Parent: 2–4, Child: 3–6 |
| Bewerkfrequentie | Laag | Hoog | Gemengd |
| Child-items | Nee | Nee | Ja (1:N) |
| Bewerkmethode | Modal/wizard | Inline (expanded) | Parent inline + child modal |
| DnD | Optioneel (rijen) | Optioneel (cards) | Twee niveaus |

---

## Gedeelde visuele elementen

Alle drie patronen delen deze tokens zodat ze als één samenhangend design aanvoelen:

### Headers

```tsx
// Floating header — geen achtergrond
className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
// Padding: px-2 pb-2 (alleen onderaan ruimte)
```

### Row dividers

```tsx
className="divide-y divide-border/50"
```

### Hover states

```tsx
// Flat Table rijen
className="hover:bg-accent/40 transition-colors duration-150"

// Collapsible Card header
className="hover:bg-accent/40 transition-colors duration-150"
```

### Actions (hover-reveal)

```tsx
className="opacity-0 group-hover:opacity-100 transition-opacity"
```

### Drag handle

```tsx
<GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
// Container: cursor-grab active:cursor-grabbing hover:bg-muted rounded touch-none
```

### Input focus

```tsx
className="border-[1.5px] border-border bg-card focus:!border-primary focus:ring-0"
```

### Footer actie

```tsx
<NestoButton variant="outline" size="sm">
  <Plus className="h-3.5 w-3.5 mr-1.5" />
  Item toevoegen
</NestoButton>
```

### Archived sectie

```tsx
<Collapsible>
  <CollapsibleTrigger>
    Gearchiveerd ({count})
  </CollapsibleTrigger>
  <CollapsibleContent className="bg-muted/30 rounded-lg p-4 mt-3">
    {/* Archived items */}
  </CollapsibleContent>
</Collapsible>
```

### StatusDot & NestoBadge

Zelfde semantische mapping in alle patronen:
- Actief: `StatusDot variant="active"` (groen)
- Inactief: `StatusDot variant="inactive"` (grijs)
- Telling: `NestoBadge variant="default"` met count

### Switch

```tsx
// Enterprise switch: h-[22px] w-[40px]
// Transitie: 250ms cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Module-toewijzing

| Module | Patroon | Reden |
|--------|---------|-------|
| Shifts | Flat Table | Alle info past in kolommen, bewerking via wizard |
| Onboarding fasen | Compound | Fase-instellingen + geneste takenlijst |
| Areas/Tafels | Compound | Area-instellingen + tafelrijen |
| Tickets | Flat Table | Naam, prijs, capaciteit — past in kolommen |
| Email templates | Collapsible Card | Body-editor, variabelen, preview nodig |
| Tafelgroepen | Flat Table | Naam + toewijzing, simpele rij |
| Team rollen | Flat Table | Naam, permissies badge, actief toggle |
| Menu categorieën + gerechten | Compound | Categorie expand, gerechten als rijen |
| Leveranciers + producten | Compound | Contactgegevens + productlijst |
| Reminders | Flat Table | Timing, trigger, kanaal — past in kolommen |

---

## Implementatie-checklists

### Flat Table checklist

- [ ] Grid template gedefinieerd met vaste kolommen
- [ ] Floating header met `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider`
- [ ] Header padding: `px-1 pb-2` (of `px-2 pb-2`)
- [ ] Rijen: `divide-y divide-border/50`
- [ ] Hover: `hover:bg-accent/40 transition-colors duration-150`
- [ ] Actions: `opacity-0 group-hover:opacity-100`
- [ ] Drag handle: `GripVertical h-3.5 w-3.5` (indien DnD)
- [ ] Footer: `NestoButton variant="outline" size="sm"` met Plus-icoon
- [ ] Archived sectie: `Collapsible` met `bg-muted/30` (indien van toepassing)
- [ ] Geen zebra striping
- [ ] Geen header achtergrond

### Collapsible Card checklist

- [ ] `NestoCard` als container
- [ ] Collapsed: naam + badges + toggle zichtbaar
- [ ] Chevron icon (`ChevronDown`/`ChevronRight`) voor expand indicator
- [ ] Expanded: inline formulier met `NestoInput`/`NestoSelect`
- [ ] Autosave via `useDebouncedCallback` (800ms)
- [ ] Input styling: `border-[1.5px] border-border bg-card focus:!border-primary focus:ring-0`
- [ ] Secties gescheiden door `border-t border-border/40 pt-4 mt-4`
- [ ] Delete via `ConfirmDialog` (niet inline)
- [ ] Drag handle op card-niveau (indien DnD)

### Compound checklist

- [ ] Alle items van Collapsible Card checklist ✓
- [ ] Collapsed header toont child-count samenvatting
- [ ] `border-t border-border/40` separator tussen parent form en child tabel
- [ ] Geneste tabel volgt volledige Flat Table checklist
- [ ] Geneste tabel heeft eigen kolomheaders
- [ ] Aparte `SortableContext` per nesting-niveau (indien DnD)
- [ ] Footer actie voor child-items binnen de card
- [ ] Max twee nesting-niveaus

---

## Cross-referenties

| Document | Relatie |
|----------|--------|
| [INLINE_DATA_TABLES.md](./INLINE_DATA_TABLES.md) | Grid layout details, DnD implementatie |
| [ENTERPRISE_DESIGN_GUIDE.md](./ENTERPRISE_DESIGN_GUIDE.md) | Centrale design tokens en anti-patronen |
| [SETTINGS_PAGE_PATTERNS.md](./SETTINGS_PAGE_PATTERNS.md) | Settings container en layout |
| [MODAL_PATTERNS.md](./MODAL_PATTERNS.md) | Modal styling voor Flat Table bewerking |

### Gerelateerde memories

- `design-pattern-collapsible-settings-cards` — Collapsible Card detail
- `design-pattern-enterprise-tables` — Floating header en rij-styling
- `settings-card-pattern-v2` — Single Card pattern voor formulieren
