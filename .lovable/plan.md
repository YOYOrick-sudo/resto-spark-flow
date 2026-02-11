
# Enterprise Design Guide: Centraal Referentiedocument

## Wat er nu is

Er bestaan 19 gedetailleerde design documenten in `docs/design/` die elk een specifiek onderwerp dekken -- van card shadows tot typography tot modal patterns. Deze docs zijn technisch correct en bevatten exacte Tailwind classes die matchen met de codebase.

Het geUploade document bevat goede filosofische uitgangspunten maar conflicteert op meerdere punten met de werkelijke implementatie (shadows vs borders, input styling, overlay opacity, etc.).

## Wat ik ga maken

Een nieuw `docs/design/ENTERPRISE_DESIGN_GUIDE.md` als **centraal hub-document** dat:

1. De kernfilosofie samenvat (gecorrigeerde versie van het geUploade doc)
2. Per onderwerp de correcte regels geeft met exacte Tailwind classes
3. Verwijst naar de detail-docs voor diepgaande implementatie
4. De "Nesto-test" checklist bevat als afsluiter
5. Alle conflicten uit het geUploade doc corrigeert

## Structuur

### Sectie 0: Kernprincipe
Enterprise aesthetic (Linear, Stripe, Polar.sh). "Typografie en witruimte doen het werk."

### Sectie 1: Component Systeem
Samenvatting van alle Nesto componenten met verwijzing naar `COMPONENT_DECISION_GUIDE.md`.

### Sectie 2: Kleurgebruik
Correcte tokens uit `COLOR_PALETTE.md`. Severity kleuren. Regel: kleur heeft altijd betekenis.

### Sectie 3: Typografie en Contrast
De 3-niveau hierarchie met exacte Tailwind classes. Zwevende headers. Verboden patronen.
Verwijzing: `ENTERPRISE_TYPOGRAPHY.md`

### Sectie 4: Cards en Surfaces
**Correctie:** Shadow als primaire afbakening (niet border). Exacte shadow waarden. Nesting regels.
Verwijzing: `CARD_SHADOWS.md`

### Sectie 5: Spacing en Density
Card padding regels. Settings container: `max-w-5xl` (niet `max-w-7xl` zoals het geUploade doc zegt). `divide-y divide-border/50` voor rij separatie.

### Sectie 6: Formulieren en Inputs
**Correctie:** `bg-card` (niet `bg-secondary/50`). `focus:!border-primary focus:ring-0` (niet `ring-2`). Switch: 250ms cubic-bezier.

### Sectie 7: Knoppen
Border radius hierarchie: primary=16px, rest=8px. Max 1 primary per scherm.
Verwijzing: `BUTTON_STYLING.md`, `BORDER_RADIUS.md`

### Sectie 8: Tabellen
**Correctie:** Geen zebra striping (verboden in enterprise typography). Zwevende headers zonder achtergrond. `divide-y divide-border/50`.
Verwijzing: `INLINE_DATA_TABLES.md`

### Sectie 9: Modals
**Correctie:** Overlay = `bg-black/20 backdrop-blur-sm` (niet `bg-black/50`). Shadow compenseert lichtere overlay.
Verwijzing: `MODAL_PATTERNS.md`

### Sectie 10: Micro-interacties
Transition tokens: 150ms (hovers), 200ms (state fades), 250ms (switches). Toast styling.

### Sectie 11: Navigatie en Layout
Sidebar, breadcrumbs, page headers. Settings: `SettingsContainer max-w-5xl`.
Verwijzing: `SETTINGS_PAGE_PATTERNS.md`, `NAVIGATION_CARDS.md`, `SIDEBAR_PANELS.md`

### Sectie 12: Feedback Patronen
Toast alleen voor expliciete acties. Autosave = inline indicator. Validatie = inline errors.
Verwijzing: `TOAST_NOTIFICATIONS.md`

### Sectie 13: Anti-patronen
Gecombineerde lijst: goede items uit het geUploade doc + codebase-specifieke verboden patronen met concrete "Fout vs Correct" voorbeelden.

### Sectie 14: De Nesto-test (checklist)
De 5-punts checklist uit het geUploade doc (deze is goed en wordt overgenomen).

## Gecorrigeerde conflicten

| Onderwerp | Geupload doc (fout) | Codebase (correct) |
|-----------|--------------------|--------------------|
| Card borders | `border border-border/40` | Shadow als primaire afbakening, geen border op top-level |
| Card hover | `hover:border-border/60` | `translateY(-1px)` + shadow change |
| Input achtergrond | `bg-secondary/50` | `bg-card` |
| Input focus | `ring-2 ring-primary/30` | `focus:!border-primary focus:ring-0` |
| Modal overlay | `bg-black/50` | `bg-black/20 backdrop-blur-sm` |
| Tabel hover | `hover:bg-secondary/30` | `hover:bg-accent/40` of `hover:bg-muted/50` |
| Zebra striping | "alleen bij >10 rijen" | Verboden -- altijd `divide-y` |
| Page margins | `max-w-7xl` | `max-w-5xl` (SettingsContainer) |
| Typography | `font-mono tabular-nums` | `tabular-nums` zonder `font-mono` |
| Data font weight | Niet gespecificeerd | `font-semibold` voor primaire data |
| Switch timing | "200ms" | 250ms cubic-bezier(0.4,0,0.2,1) |

## Wat er NIET verandert

- Alle 19 bestaande detail-docs blijven bestaan als diepe referentie
- Geen codewijzigingen -- dit is puur documentatie
- Het nieuwe document vervangt niets, het consolideert en corrigeert

## Resultaat

Na implementatie: 1 document (`ENTERPRISE_DESIGN_GUIDE.md`) dat als standaard referentie dient bij elke UI-prompt. Het bevat de correcte regels en verwijst naar detail-docs voor implementatie-specifics.
