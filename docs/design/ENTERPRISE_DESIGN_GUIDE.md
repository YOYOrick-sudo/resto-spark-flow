# ENTERPRISE DESIGN GUIDE — Nesto Polar

> **Dit is het centrale referentiedocument voor alle UI in Nesto.** Elke nieuwe module, pagina of component wordt tegen dit document getoetst. Detail-docs in `docs/design/` dienen als diepe referentie per onderwerp.

---

## Sectie 0: Kernprincipe

**Enterprise aesthetic geïnspireerd door Linear, Stripe en Polar.sh.**

> "Typografie en witruimte doen het werk — niet achtergrondkleuren en zware borders."

- Elke kleur heeft **betekenis** (status, interactie, accent) — nooit decoratief
- Shadow vervangt border als primaire visuele afbakening
- Density en scanability boven visuele flair
- Consistentie boven creativiteit: gebruik het design system, nooit raw HTML

---

## Sectie 1: Component Systeem

Alle UI wordt gebouwd met het **Nesto Polar** component systeem. Raadpleeg de Pre-build Checklist (10 punten) vóór elk nieuw component.

### Kerncomponenten

| Categorie | Componenten |
|-----------|------------|
| **Containers** | `NestoCard`, `FormSection`, `StatCard` |
| **Input** | `NestoInput`, `NestoSelect`, `NestoModal`, `Switch`, `Checkbox` |
| **Knoppen** | `NestoButton`, `NestoOutlineButtonGroup` |
| **Data** | `DataTable`, `NestoTable`, `StatusDot`, `NestoBadge` |
| **Feedback** | `toast()`, `ConfirmDialog`, `EmptyState`, `InfoAlert` |
| **Layout** | `PageHeader`, `DetailPageLayout`, `SettingsPageLayout`, `DetailPanel` |
| **Help** | `TitleHelp`, `FieldHelp` |

**Verboden:** Raw `<div>` als kaart, raw `<input>`/`<select>`, shadcn `Badge` rechtstreeks, `shadow-sm` of andere Tailwind shadows op cards.

→ **Detail:** [COMPONENT_DECISION_GUIDE.md](./COMPONENT_DECISION_GUIDE.md)

---

## Sectie 2: Kleurgebruik

### Primaire Kleuren

| Naam | HEX | HSL | CSS Variable |
|------|-----|-----|--------------|
| Primary (Teal) | `#1d979e` | `183 70% 37%` | `--primary` |
| Primary Hover | `#2BB4BC` | `183 63% 45%` | `--primary-hover` |

### Tekst Kleuren

| Naam | Tailwind | Gebruik |
|------|---------|---------|
| Primary text | `text-foreground` | Headings, primaire data |
| Secondary text | `text-muted-foreground` | Labels, kolomkoppen |
| Placeholder | `text-muted-foreground` | Hulptekst, placeholders |

### Status Kleuren

| Status | HEX | CSS Variable | Tailwind |
|--------|-----|--------------|---------|
| Success | `#10B981` | `--success` | `bg-success`, `text-success` |
| Pending | `#FF9900` | `--pending` | `bg-pending`, `text-pending` |
| Warning/Error | `#EF4444` | `--error` | `bg-error`, `text-error` |

### Regel

Kleur heeft **altijd** betekenis: status, interactie-feedback, of brand accent. Decoratieve kleur is verboden.

→ **Detail:** [COLOR_PALETTE.md](./COLOR_PALETTE.md)

---

## Sectie 3: Typografie en Contrast

### De 3-niveau hiërarchie

| Niveau | Tailwind | Wanneer | Voorbeelden |
|--------|---------|---------|-------------|
| **Primair (data)** | `text-foreground font-semibold` | Informatie die moet opvallen | Namen, datums, tijden, bedragen |
| **Secundair (metadata)** | `text-foreground/70` | Ondersteunende context | Scope, interval, beschrijvingen |
| **Tertiair (labels)** | `text-muted-foreground` | Structurele labels | Kolomkoppen, hulptekst, placeholders |

### Zwevende Headers

Tabel- en sectieheaders hebben **geen achtergrondkleur**. Ze zweven boven de data:

```tsx
className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
// Padding: px-2 pb-2 (alleen onderaan ruimte)
```

### Verboden

| Verboden | Correct |
|----------|---------|
| `text-muted-foreground/70` of `/60` | Volle `text-muted-foreground` |
| `font-medium` op data-waarden | `font-semibold` voor primaire data |
| `bg-muted/40` op tabel headers | Geen achtergrond (zwevende labels) |
| `font-mono` voor getallen | `tabular-nums` (zonder `font-mono`) |
| `text-xs font-medium` voor headers | `text-[11px] font-semibold uppercase tracking-wider` |

→ **Detail:** [ENTERPRISE_TYPOGRAPHY.md](./ENTERPRISE_TYPOGRAPHY.md)

---

## Sectie 4: Cards en Surfaces

### Shadow als primaire afbakening

Cards gebruiken **shadow**, niet border, als visuele grens.

| Type | Shadow | Border |
|------|--------|--------|
| **Top-level** | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)` | Geen |
| **Hover** | `0 4px 12px rgba(0,0,0,0.08)` + `translateY(-1px)` | Geen |
| **Nested** | Geen | `border border-border/40` |

### Nesting Regels

- **Card-in-card nesting is VERBODEN.** Elke content-groep is één `NestoCard`.
- Nested elementen gebruiken `border border-border/40` zonder shadow.
- Groeperings-zones (lanes, kolommen): `bg-secondary/50 border border-border/40 rounded-lg`

### Achtergrond-gebieden

| Patroon | Styling | Wanneer |
|---------|---------|---------|
| Groepering | `bg-secondary/50 border border-border/40 rounded-lg` | Pipeline lanes, zones |
| Sidebar | `bg-secondary rounded-card p-5` | Filter/categorie panels |
| Form groep (modal) | `bg-secondary/50 rounded-card p-4` | Veld groepering |
| Archived | `bg-muted/30 rounded-lg p-4` | Gearchiveerde secties |

→ **Detail:** [CARD_SHADOWS.md](./CARD_SHADOWS.md)

---

## Sectie 5: Spacing en Density

### Card Padding

| Context | Padding |
|---------|---------|
| NestoCard standaard | `p-6` (24px) |
| NestoCard compact | `p-4` (16px) |
| Navigation card | `py-3 px-4` (12px/16px) |

### Settings Container

```tsx
<SettingsContainer>  {/* max-w-5xl mx-auto */}
  {children}
</SettingsContainer>
```

**Let op:** `max-w-5xl` — niet `max-w-7xl`.

### Rij Separatie

```tsx
// ✅ Correct
className="divide-y divide-border/50"

// ❌ Verboden
className="border-b border-border"           // Te zwaar
className="even:bg-muted/20"                 // Zebra striping verboden
```

### Spacing Overzicht

| Element | Spacing |
|---------|---------|
| Header → content | `mb-6` |
| Sectie divider | `border-t my-6` |
| Items in lijst | `space-y-3` |
| Form field rows | `py-3` |
| Sidebar item gap | `space-y-1` |

---

## Sectie 6: Formulieren en Inputs

### Input Styling (NestoInput)

| Property | Waarde |
|----------|--------|
| Achtergrond | `bg-card` |
| Border | `1.5px solid` border-border |
| Focus | `focus:!border-primary focus:ring-0` |
| Border radius | `rounded-button` (8px) |

**Verboden:**
- `bg-secondary/50` als input achtergrond
- `ring-2 ring-primary/30` als focus state
- Raw `<input>` of `<textarea>` — altijd `NestoInput` of de gestylde `Textarea`

### Switch Styling

```tsx
// Dimensies: h-[22px] w-[40px]
// Transitie: 250ms cubic-bezier(0.4, 0, 0.2, 1)
// Checked: bg-primary met inset shadow
// Unchecked: bg-muted met border-border
```

### Labels

- Altijd **sentence case** — nooit UPPERCASE
- Font: `text-[13px] font-medium text-muted-foreground`
- Via `label` prop op `NestoInput`/`NestoSelect`

### Formulier Groepering

- In modals: secties gescheiden door `border-t border-border/50 pt-4 mt-4`
- In pages: `FormSection` component met titel
- In cards: `bg-secondary/50 rounded-card p-4` voor veld groepering

---

## Sectie 7: Knoppen

### Border Radius Hiërarchie

| Type | Radius | Token |
|------|--------|-------|
| Primary (filled teal) | 16px | `rounded-button-primary` |
| Outline/Secondary/Danger | 8px | `rounded-button` |
| Mini controls (+/-) | 6px | `rounded-control` |

### Regels

- **Max 1 primary button per zichtbaar scherm**
- Primary buttons rechts-uitgelijnd in footer/header
- `leftIcon` voor Create-acties (Plus), nooit voor Cancel/Back
- `isLoading` prop voor async acties
- Loading tekst: "Opslaan..." (niet spinner-only)

### Button Types

| Type | Achtergrond | Hover | Gebruik |
|------|------------|-------|---------|
| Primary | `bg-primary` (#1d979e) | `bg-primary-hover` (#2BB4BC) | Hoofdacties |
| Secondary | `bg-secondary` (#F4F5F6) | Darker grey | Cancel, Back |
| Outline | Transparent | `bg-accent/50` | Filter toggles |
| Danger | `bg-destructive` (#EF4444) | Darker red | Delete |
| Ghost | Transparent | `bg-secondary` | Toolbar, icons |

→ **Detail:** [BUTTON_STYLING.md](./BUTTON_STYLING.md), [BORDER_RADIUS.md](./BORDER_RADIUS.md)

---

## Sectie 8: Tabellen

### Enterprise Tabel Regels

1. **Geen zebra striping** — altijd `divide-y divide-border/50`
2. **Zwevende headers** — geen `bg-muted/40` achtergrond
3. **Header styling:** `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider`
4. **Header padding:** `px-2 pb-2` (alleen onderaan)
5. **Data tekst:** `text-foreground font-semibold` voor primaire kolommen
6. **Hover:** `hover:bg-muted/30 transition-colors duration-150 cursor-pointer`
7. **Lege waarden:** Leeg laten — geen "Geen", "N/A" of placeholder badges
8. **Actions:** `opacity-0 group-hover:opacity-100` (hover-reveal)

### Inline Data Table Grid

```tsx
// Standaard 6-koloms
grid-cols-[32px_1fr_80px_40px_80px_32px]

// Header row (zelfde grid, geen achtergrond)
className="grid grid-cols-[...] gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-2 border-b border-border/50 mb-1"
```

→ **Detail:** [INLINE_DATA_TABLES.md](./INLINE_DATA_TABLES.md)

---

## Sectie 9: Modals

### Overlay

```tsx
// ✅ Correct
className="bg-black/20 backdrop-blur-sm"

// ❌ Verboden
className="bg-black/50"   // Te zwaar
className="bg-black/80"   // Veel te zwaar
```

### Modal Shadow

```tsx
shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]
```

De sterkere shadow compenseert voor de lichtere overlay.

### Structuur

- Default size: `md` (max-w-lg, ~480px)
- Labels: sentence case, `text-[13px] font-medium text-muted-foreground`
- Secties: gescheiden door `border-t border-border/50 pt-4 mt-4`
- Footer: `flex justify-end gap-3 pt-4` — Annuleren (outline) links, primaire actie rechts
- Loading: `disabled={isPending}`, tekst "Opslaan..."

### Verboden

- "Coming soon" placeholders in modals
- Uppercase labels
- Gecentreerde buttons (altijd rechts)
- `NestoModal` voor delete bevestiging → gebruik `ConfirmDialog`

→ **Detail:** [MODAL_PATTERNS.md](./MODAL_PATTERNS.md)

---

## Sectie 10: Micro-interacties

### Transition Tokens

| Duur | Gebruik | Voorbeeld |
|------|---------|-----------|
| `150ms` | Hovers, stagger effect | `transition-colors duration-150` |
| `200ms` | State fades, navigation | `transition-all duration-200` |
| `250ms` | Switch toggle | `duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]` |

### Drag-and-Drop

- Transition: `200ms cubic-bezier(0.25, 1, 0.5, 1)`
- Origineel: `opacity: 0, visibility: hidden` tijdens drag
- Overlay: minimale styling, geen interactieve elementen
- Handle: `GripVertical` met `cursor-grab active:cursor-grabbing`

### Toast Styling

| Variant | Left Border | Wanneer |
|---------|-------------|---------|
| `success` | Groen (#22C55E) | Actie geslaagd |
| `error` | Rood (#EF4444) | Fout opgetreden |
| `warning` | Oranje (#F97316) | Let op |
| `info` | Teal (primary) | Neutrale info |

- Positie: bottom-right
- Duration: 4000ms
- Border radius: 12px
- Left border: 3px solid

→ **Detail:** [TOAST_NOTIFICATIONS.md](./TOAST_NOTIFICATIONS.md)

---

## Sectie 11: Navigatie en Layout

### Sidebar

- Container: `bg-secondary rounded-card p-5 w-60`
- Titels: HOOFDLETTERS, `text-sm font-semibold text-foreground mb-4`
- Items: `rounded-dropdown` (12px), `border-[1.5px]`
- Active: `bg-selected-bg border-selected-border text-primary font-semibold`
- Default: `bg-transparent border-transparent text-muted-foreground hover:bg-accent/60`

### Navigation Cards

- Padding: `py-3 px-4` (compact enterprise)
- Border: `border border-border` (1px)
- Hover: `hover:bg-accent/50 hover:shadow-sm`
- Icon container: `w-8 h-8 rounded-md bg-primary/5`
- Chevron: `group-hover:translate-x-0.5 group-hover:text-primary`
- Level 2 (modules): `grid grid-cols-1 md:grid-cols-2 gap-4`
- Level 3 (subsecties): `space-y-3 max-w-2xl`

### Settings Layout

- Container: `SettingsContainer` → `max-w-5xl mx-auto`
- Geen titelduplicatie: page header geeft titel, cards beginnen direct met content
- Primaire actie in page header, niet in card header

### Disabled Nav Items

- `opacity-40 cursor-default` — geen "Coming soon" badges

→ **Detail:** [SETTINGS_PAGE_PATTERNS.md](./SETTINGS_PAGE_PATTERNS.md), [NAVIGATION_CARDS.md](./NAVIGATION_CARDS.md), [SIDEBAR_PANELS.md](./SIDEBAR_PANELS.md)

---

## Sectie 12: Feedback Patronen

| Situatie | Patroon | Voorbeeld |
|----------|---------|-----------|
| Expliciete actie geslaagd | Toast success | `toast.success("Area aangemaakt")` |
| API error | Toast error | `toast.error("Fout bij opslaan")` |
| Autosave bevestiging | Inline indicator | "Opgeslagen" naast veld — **geen toast** |
| Form validatie | Inline error | `NestoInput error="Verplicht veld"` |
| Destructieve bevestiging | ConfirmDialog | "Weet je zeker...?" |
| Loading (data) | Skeleton | `TableSkeleton`, `CardSkeleton` |
| Loading (actie) | Button spinner | `NestoButton isLoading` |
| Lege staat | EmptyState | Icon + CTA |

### Verboden

- Toast voor form validatie
- Toast voor autosave
- Alert voor tijdelijke meldingen
- Spinner als enige loading indicator (gebruik skeleton)

→ **Detail:** [TOAST_NOTIFICATIONS.md](./TOAST_NOTIFICATIONS.md)

---

## Sectie 13: Anti-patronen

| Fout | Correct |
|------|---------|
| `border` op top-level NestoCard | Shadow is de primaire afbakening |
| `hover:border-border/60` op cards | `translateY(-1px)` + shadow change |
| `bg-secondary/50` als input achtergrond | `bg-card` |
| `ring-2 ring-primary/30` als focus | `focus:!border-primary focus:ring-0` |
| `bg-black/50` modal overlay | `bg-black/20 backdrop-blur-sm` |
| `hover:bg-secondary/30` tabel hover | `hover:bg-muted/30` |
| Zebra striping (`even:bg-muted/20`) | `divide-y divide-border/50` |
| `max-w-7xl` voor settings | `max-w-5xl` (SettingsContainer) |
| `font-mono tabular-nums` | `tabular-nums` zonder `font-mono` |
| `font-medium` op data | `font-semibold` voor primaire data |
| Switch met `200ms` transitie | `250ms cubic-bezier(0.4,0,0.2,1)` |
| Raw `<div>` als kaart | `NestoCard` met juiste variant |
| shadcn `Badge` | `NestoBadge` met semantische variant |
| `NestoModal` voor delete | `ConfirmDialog` |
| `bg-muted/40` op tabel headers | Geen achtergrond, zwevende labels |
| `text-muted-foreground/70` of `/60` | Volle `text-muted-foreground` |
| `bg-secondary/30` voor groepering | `bg-secondary/50 border border-border/40` |
| "Coming soon" in navigatie | `opacity-40 cursor-default` |
| "Geen" of "N/A" bij lege waarden | Leeg laten |

---

## Sectie 14: De Nesto-test

Voer deze 5-punts checklist uit op elk nieuw scherm of component:

### ✅ 1. Zou dit passen in Linear of Stripe?
Als het antwoord nee is → terug naar de tekentafel. Enterprise SaaS, geen consumer app.

### ✅ 2. Kan ik elk UI-element herleiden tot het design system?
Elke card = `NestoCard`, elke button = `NestoButton`, elke input = `NestoInput`. Geen raw HTML, geen ad-hoc styling.

### ✅ 3. Heeft elke kleur een reden?
Teal = actie/accent. Groen/oranje/rood = status. Grijs = structuur. Als een kleur geen betekenis heeft, verwijder het.

### ✅ 4. Is de tekst hiërarchie correct?
Data = `font-semibold text-foreground`. Metadata = `text-foreground/70`. Labels = `text-muted-foreground`. Geen opacity modifiers op tertiair niveau.

### ✅ 5. Zou een gebruiker dit 8 uur per dag willen gebruiken?
Geen visuele ruis, geen onnodige animaties, geen afleidende kleuren. Rust en scanability.

---

## Detail-documenten Index

| Document | Onderwerp |
|----------|-----------|
| [COMPONENT_DECISION_GUIDE.md](./COMPONENT_DECISION_GUIDE.md) | Pre-build checklist, component catalogus, decision tree |
| [COLOR_PALETTE.md](./COLOR_PALETTE.md) | Kleur tokens, status kleuren, badge kleuren |
| [ENTERPRISE_TYPOGRAPHY.md](./ENTERPRISE_TYPOGRAPHY.md) | Tekst hiërarchie, zwevende headers, verboden patronen |
| [CARD_SHADOWS.md](./CARD_SHADOWS.md) | Shadow waarden, nesting regels |
| [BUTTON_STYLING.md](./BUTTON_STYLING.md) | Button types, hover states, sizes |
| [BORDER_RADIUS.md](./BORDER_RADIUS.md) | Radius tokens (6/8/12/16px) |
| [INLINE_DATA_TABLES.md](./INLINE_DATA_TABLES.md) | Grid layouts, drag-drop, archived secties |
| [MODAL_PATTERNS.md](./MODAL_PATTERNS.md) | Overlay, shadow, structuur, footer |
| [TOAST_NOTIFICATIONS.md](./TOAST_NOTIFICATIONS.md) | Toast varianten, styling, wanneer wel/niet |
| [SETTINGS_PAGE_PATTERNS.md](./SETTINGS_PAGE_PATTERNS.md) | Settings layout, formulieren, dividers |
| [NAVIGATION_CARDS.md](./NAVIGATION_CARDS.md) | Navigation card styling, layout varianten |
| [SIDEBAR_PANELS.md](./SIDEBAR_PANELS.md) | Sidebar container, menu items, selected state |
| [SCROLL_BEHAVIOR.md](./SCROLL_BEHAVIOR.md) | Scroll patronen |
| [CONTEXTUAL_HELP.md](./CONTEXTUAL_HELP.md) | TitleHelp, FieldHelp patronen |
| [DASHBOARD_TILES.md](./DASHBOARD_TILES.md) | Dashboard tile patronen |
| [BOOKING_WINDOW.md](./BOOKING_WINDOW.md) | Booking window configuratie |
| [SQUEEZE_LOGIC.md](./SQUEEZE_LOGIC.md) | Squeeze reservering logica |
| [SHIFTS_ARCHITECTURE.md](./SHIFTS_ARCHITECTURE.md) | Shifts module architectuur |
| [SETTINGS_MULTI_LEVEL_NAVIGATION.md](./SETTINGS_MULTI_LEVEL_NAVIGATION.md) | Multi-level settings navigatie |
