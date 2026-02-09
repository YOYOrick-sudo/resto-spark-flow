# Component Decision Guide — Nesto Polar Design System

> **Instructie:** Dit document wordt geraadpleegd bij **elke nieuwe module, pagina of component** voordat er code geschreven wordt. Loop eerst de Pre-build Checklist door, gebruik daarna de Decision Tree en Component Catalogus als referentie.

---

## Sectie 0: Pre-build Checklist

Loop deze 8 vragen door voordat je begint met bouwen:

### Containers & Layout

- [ ] **1.** Gebruik ik `NestoCard` (met juiste variant) in plaats van een raw `<div>` voor kaarten/content blokken?
- [ ] **2.** Gebruik ik `bg-secondary/50 border border-border/40` voor groeperings-zones (kolommen, lanes) — nooit `bg-secondary/30` of lager?
- [ ] **3.** Geen card-in-card nesting? Elke content-groep is een eigen NestoCard.

### Interactie

- [ ] **4.** Welke `NestoButton` variant past? (primary voor hoofdactie, outline voor secundair, danger voor destructief, ghost voor toolbar)
- [ ] **5.** Maximaal 1 primary button per zichtbaar scherm, rechts-uitgelijnd?
- [ ] **6.** Formuliervelden via `NestoInput` / `NestoSelect` / `NestoModal` — nooit raw HTML inputs?

### Feedback

- [ ] **7.** Welk feedback patroon? Toast voor expliciete acties, inline error voor validatie, ConfirmDialog voor destructief, EmptyState voor lege data.
- [ ] **8.** Badges via `NestoBadge` met semantische variant (success/pending/error) — nooit shadcn Badge rechtstreeks?

---

## Sectie 1: Component Catalogus

### Containers & Surfaces

| Component | Wanneer | Styling |
|-----------|---------|---------|
| `NestoCard` | Elke top-level content container (formulieren, data blokken, dashboard tiles) | Shadow, geen border, rounded-card |
| `NestoCard variant="small"` | Compacte klikbare items (pipeline kaarten, lijstitems) | p-4, shadow |
| `NestoCard hoverable` | Klikbare kaarten met hover feedback | Shadow + lift-effect |
| `NestoCard nested` | Items BINNEN een card (nooit als outer wrapper) | border-border/40, geen shadow |
| `FormSection` | Groep gerelateerde formuliervelden met titel | border + rounded-2xl, p-6 |
| `StatCard` | Dashboard metrics met trend indicator | border + rounded-2xl, p-6 |

### Achtergrond-gebieden (geen card)

| Patroon | Wanneer | Styling |
|---------|---------|---------|
| `bg-secondary/50 border border-border/40 rounded-lg` | Groeperings-container (kolommen, lanes, zones) | Subtiele achtergrond, geen shadow |
| `bg-secondary rounded-card p-5` | Sidebar panels (filters, categorieën) | Panel achtergrond |
| `bg-secondary/50 rounded-card p-4` | Form field groepering binnen modals | Enterprise grouping pattern |
| `bg-muted/30 rounded-lg p-4` | Gearchiveerde/secundaire secties | Muted fallback |

### Navigatie

| Component | Wanneer |
|-----------|---------|
| Navigation Card (inline Link) | Navigeerbare items in settings |
| `MethodCard` | Selecteerbare opties (radio-achtig, met icon) |

### Pagina-niveau

| Component | Wanneer |
|-----------|---------|
| `PageHeader` | Titel + subtitle + actieknoppen bovenaan elke pagina |
| `DetailPageLayout` | Detail pagina's met terug-knop en tabs |
| `DetailPanel` | Split-view sidebar (desktop: inline, mobile: sheet) |
| `SettingsPageLayout` | Settings pagina's met zijbalk navigatie |

### Data Display

| Component | Wanneer |
|-----------|---------|
| `DataTable` | Tabeldata met sortering, paginatie, selectie |
| `NestoTable` | Eenvoudige tabellen zonder interactie |
| `EmptyState` | Geen data beschikbaar (met icon + CTA) |
| `SearchBar` | Zoekbalk met debounce |
| `StatusDot` | Kleur-indicator bij status waarden |

### Formulieren & Input

| Component | Wanneer |
|-----------|---------|
| `NestoInput` | Tekstvelden |
| `NestoSelect` | Dropdowns |
| `NestoButton` | Alle knoppen (primary/secondary/outline/ghost/danger) |
| `NestoModal` | Dialogen en wizards |
| `ConfirmDialog` | Bevestiging bij destructieve acties |

### Feedback & Help

| Component | Wanneer |
|-----------|---------|
| `NestoBadge` | Labels, counts, status indicators |
| `InfoAlert` | Contextuele berichten (info/warning/success/error) |
| `TitleHelp` | Uitleg bij paginatitels |
| `FieldHelp` | Uitleg bij formuliervelden |
| `toast()` | Tijdelijke meldingen na acties |

---

## Sectie 2: Decision Tree

```text
"Ik wil content tonen op de pagina"
  |
  +-- Is het een meetbare waarde/KPI?
  |     -> StatCard
  |
  +-- Is het een groep formuliervelden?
  |     -> FormSection (met titel)
  |     -> bg-secondary/50 rounded-card p-4 (zonder titel, in modal)
  |
  +-- Is het een klikbaar item in een lijst?
  |     -> NestoCard variant="small" hoverable
  |
  +-- Is het een content blok (tekst, tabel, configuratie)?
  |     -> NestoCard (default)
  |
  +-- Is het een groeperings-zone (kolom, lane, dropzone)?
  |     -> bg-secondary/50 border border-border/40 rounded-lg
  |     NOOIT: NestoCard als outer wrapper
  |
  +-- Is het een navigatie-item naar een andere pagina?
  |     -> Navigation Card pattern (Link + border + hover:bg-accent/50)
  |     -> MethodCard (als het een keuze is, niet navigatie)
  |
  +-- Is het een selecteerbare optie?
  |     -> MethodCard (met selected state)
  |     -> NestoOutlineButtonGroup (compacte toggle)
  |
  +-- Is het een zijpaneel met filters of categorieën?
  |     -> FilterSidebar / CategorySidebar
  |
  +-- Is het een lege staat?
        -> EmptyState
```

---

## Sectie 3: Anti-patterns (Verboden)

| Anti-pattern | Waarom fout | Correcte oplossing |
|-------------|-------------|-------------------|
| Raw `<div className="bg-card border border-border/50 ...">` als kaart | Inconsistente shadow/hover, valt weg | `NestoCard` met juiste variant |
| `bg-secondary/30` voor groepering | Te lage opacity, onzichtbaar | `bg-secondary/50 border border-border/40` |
| Card-in-card nesting (NestoCard in NestoCard) | Verwarrende visuele hiërarchie | Eén card per content groep |
| `border` op top-level NestoCard | Shadow is de primaire afbakening | Geen border, shadow doet het werk |
| Eigen hover styling op klikbare kaarten | Inconsistent met systeem | `NestoCard hoverable` |
| `shadow-sm` of Tailwind shadows op cards | Afwijkend van shadow tokens | Gebruik NestoCard (shadow via inline style) |
| Raw `<input>` of `<select>` | Inconsistente styling | `NestoInput` / `NestoSelect` |
| shadcn `Badge` rechtstreeks | Mist Nesto varianten | `NestoBadge` met semantische variant |
| Toast voor form validatie | Verwarrend, inline is beter | `NestoInput error="..."` |
| `NestoModal` voor delete bevestiging | Te zwaar | `ConfirmDialog` |

---

## Sectie 4: Quick Reference per Module Type

**Pipeline/Kanban board:**
- Kolommen: `bg-secondary/50 border border-border/40 rounded-lg p-3`
- Kaarten: `NestoCard variant="small" hoverable`
- Headers: `NestoBadge` voor count

**Dashboard:**
- Metrics: `StatCard`
- Tiles: `NestoCard` (met hoverable als klikbaar)
- Leeg: `EmptyState`

**Lijstpagina (overzicht):**
- Header: `PageHeader`
- Tabel: `DataTable`
- Filters: `FilterSidebar` of `SearchBar`
- Leeg: `EmptyState`

**Detail pagina:**
- Layout: `DetailPageLayout`
- Content blokken: `NestoCard`
- Formulieren: `FormSection`
- Zijpaneel: `DetailPanel`

**Settings:**
- Layout: `SettingsPageLayout` of `SettingsModuleLayout`
- Navigatie: Navigation Card pattern
- Config blokken: `NestoCard` met `border-t` dividers
- Container: `SettingsContainer` (max-w-5xl)

---

## Sectie 5: Knoppen

| Actie | Variant | Size | Icoon | Voorbeeld |
|-------|---------|------|-------|-----------|
| Hoofdactie pagina (Create, Save) | `primary` | `default` | `leftIcon` optioneel | "+ Nieuwe reservering" |
| Annuleren / Terug | `outline` | `default` | Geen | "Annuleren" |
| Secundaire actie naast primary | `outline` | `default` | Geen | "Exporteren" |
| Destructieve actie (Delete) | `danger` | `default` | Trash2 als leftIcon | "Verwijderen" |
| Toolbar / inline actie | `ghost` | `sm` of `icon` | Alleen icoon | Edit, kebab menu |
| Filter toggle groep | `NestoOutlineButtonGroup` | `md` | Geen | Lunch/Diner, Actief/Inactief |

**Regels:**
- Primary buttons altijd rechts in footer/header (rechts-uitgelijnd)
- Maximaal 1 primary button per zichtbaar scherm
- `isLoading` prop voor async acties
- `leftIcon` voor Create-acties (Plus), nooit voor Cancel/Back
- `size="icon"` alleen voor toolbar controls (edit, delete, close)
- Radius: Primary = 16px (`rounded-button-primary`), overige = 8px (`rounded-button`), mini = 6px (`rounded-control`)

---

## Sectie 6: Formulier Elementen

| Ik heb nodig... | Component | Wanneer |
|-----------------|-----------|---------|
| Tekst (kort) | `NestoInput` | Naam, email, nummer, telefoon |
| Tekst (lang, multi-line) | `Textarea` (uit ui/) | Notities, beschrijvingen |
| Keuze uit vaste lijst | `NestoSelect` | Status, categorie, type (max ~20 opties) |
| Aan/uit toggle | `Switch` (uit ui/) | Online status, feature toggles — auto-save |
| Ja/nee keuze | `Checkbox` (uit ui/) | Akkoord, multi-select filters |
| Keuze uit 2-4 opties (visueel) | `MethodCard` | Betaalmethode, type selectie |
| Keuze uit 2-4 opties (compact) | `NestoOutlineButtonGroup` | Filter toggles |
| Datum | `Calendar` + `Popover` | Datum selectie |

**Validatie:**
- Inline errors via `error` prop op `NestoInput`/`NestoSelect` — nooit toast
- Labels altijd sentence case via `label` prop
- Groepering: `FormSection` (met titel) of `bg-secondary/50 rounded-card p-4` (in modal)
- Dividers: `border-t border-border/50 pt-4 mt-4` tussen secties in modals

---

## Sectie 7: Modals vs Sheets vs Detail Pagina's

```text
"De gebruiker moet iets aanmaken of bewerken"
  |
  +-- Is het 1-5 velden, snelle actie?
  |     -> NestoModal size="md"
  |     Voorbeeld: Tafel aanmaken, Area bewerken
  |
  +-- Is het een wizard (meerdere stappen)?
  |     -> NestoModal size="lg" met steps prop
  |     Voorbeeld: Shift aanmaken (5 stappen)
  |
  +-- Moet de gebruiker context zien naast het formulier?
  |     -> DetailPanel (inline op desktop, Sheet op mobile)
  |     Voorbeeld: Reservering detail naast de lijst
  |
  +-- Is het een volledige CRUD-pagina met eigen URL?
  |     -> DetailPageLayout (eigen route met tabs)
  |     Voorbeeld: /recepten/:id, /onboarding/:id
  |
  +-- Is het een destructieve bevestiging?
        -> ConfirmDialog (nooit NestoModal)
        Voorbeeld: "Weet je zeker dat je wilt verwijderen?"
```

**Regels:**
- Modal overlay: `bg-black/20 backdrop-blur-sm`
- Default size: `md` (max-w-lg)
- Footer: rechts-uitgelijnd, Annuleren (outline) links, primaire actie rechts

---

## Sectie 8: Feedback Patronen

| Situatie | Patroon | Component |
|----------|---------|-----------|
| Actie geslaagd (button click) | Toast | `toast.success("Area aangemaakt")` |
| Fout bij API call | Toast | `toast.error("Fout bij opslaan")` |
| Waarschuwing | Toast | `toast.warning("Wijzigingen niet opgeslagen")` |
| Autosave bevestiging | Inline tekst | "Opgeslagen" naast het veld — GEEN toast |
| Form validatiefout | Inline error | `NestoInput error="Verplicht veld"` |
| Contextuele uitleg op pagina | Alert blok | `InfoAlert variant="info"` |
| Destructieve actie bevestigen | Dialog | `ConfirmDialog variant="destructive"` |
| Loading (data ophalen) | Skeleton | `TableSkeleton`, `CardSkeleton`, `PageSkeleton` |
| Loading (actie uitvoeren) | Button spinner | `NestoButton isLoading` |
| Lege staat | Illustratie + CTA | `EmptyState` |

**Verboden:**
- Toast voor form validatie
- Toast voor autosave
- Alert voor tijdelijke meldingen (gebruik toast)
- Spinner als enige loading indicator (gebruik skeleton voor content)

---

## Sectie 9: Badges

| Variant | Kleur | Wanneer | Voorbeeld |
|---------|-------|---------|-----------|
| `default` | Grijs | Neutrale labels, counts | "12 items" |
| `primary` | Teal | Actieve/huidige status | "Actief" |
| `success` | Groen | Positief resultaat | "Bevestigd", "Online" |
| `pending` | Amber | In afwachting | "In behandeling" |
| `warning` | Oranje | Aandacht nodig | "Bijna vol" |
| `error` | Rood | Probleem/negatief | "Verlopen", "No-show" |
| `outline` | Border only | Subtiele metadata | "Optioneel" |
| `outline-error` | Rode border | Subtiele waarschuwing | "Uitgeschakeld" |
| `soon` | Amber filled | Feature preview | "Binnenkort" |

**Regels:**
- `dot` prop voor status-badges met gekleurde indicator
- `size="sm"` in compacte tabellen, `size="default"` standaard, `size="lg"` alleen in headers
- Gebruik `NestoBadge`, nooit shadcn `Badge` rechtstreeks
