

# Design Tokens: Kleuren & Shadows Standaardisatie

## Overzicht
Alle hardcoded kleuren (hex, rgba, bg-white) en inline shadows vervangen door design tokens. NestoCard hover-logica vereenvoudigen van JavaScript naar pure CSS. Geen visuele veranderingen -- puur technische opschoning.

## Stap 1: Shadow tokens toevoegen

### 1a. CSS variabelen in `src/index.css` (`:root` blok)
Vier nieuwe custom properties:
- `--shadow-sm`: subtiele schaduw voor lichte elementen
- `--shadow-card`: standaard card schaduw
- `--shadow-hover`: hover-state schaduw
- `--shadow-toast`: toast notificatie schaduw

### 1b. Tailwind config (`tailwind.config.ts`)
Toevoegen onder `theme.extend.boxShadow`:
- `sm`, `card`, `hover`, `toast`, `toast-dark`

## Stap 2: NestoCard refactor (belangrijkste wijziging)

Verwijder alle inline `style={{ boxShadow }}` en JavaScript `onMouseEnter`/`onMouseLeave` handlers. Vervang door:
- `shadow-card` (standaard)
- `hover:shadow-hover` (hoverable)
- `shadow-none` (nested)
- `border border-border/50` altijd (niet alleen dark mode)

## Stap 3: Inline shadow vervanging in andere componenten

| Bestand | Huidig | Nieuw |
|---------|--------|-------|
| `StatCard.tsx` | inline `style={{ boxShadow }}` | `shadow-card` class |
| `FormSection.tsx` | inline `style={{ boxShadow }}` | `shadow-card` class |
| `nestoToast.tsx` | `shadow-[0_4px_24px_rgba...]` | `shadow-toast dark:shadow-toast-dark` |
| `MessageThread.tsx` | `shadow-[0_1px_3px_rgba...]` | `shadow-card dark:shadow-none` |
| `ReservationListView.tsx` | `shadow-[0_1px_3px_rgba(0,0,0,0.05)]` | `shadow-sm` |
| `index.css .nesto-card-base` | inline `box-shadow` | `shadow-sm` |

## Stap 4: Kleur vervanging

| Bestand | Huidig | Nieuw |
|---------|--------|-------|
| `NestoSidebar.tsx` | `text-[#1d979e]` | `text-primary` |
| `Dashboard.tsx` | `bg-orange-50/50`, `text-orange-500`, etc. | `bg-warning/5`, `text-warning`, etc. |
| `Dashboard.tsx` | `text-2xl font-semibold` | `text-h1` |
| `NestoSelect.tsx` | `bg-white dark:bg-card` | `bg-card` |
| `CategorySidebar.tsx` | `text-white` op badge | `text-primary-foreground` |
| `NestoBadge.tsx` | `text-white` op soon-variant | `text-primary-foreground` |
| `ReservationsTile.tsx` | `stopColor="#1d979e"`, `stroke="#1d979e"` | `hsl(var(--primary))` waar mogelijk, HSL-strings voor SVG tick renderers |

### NIET gewijzigd
- `src/components/ui/*` (ShadCN bestanden)
- Shift/Ticket kleur-presets (user-selectable data)
- `SettingsCommunicatie.tsx` (hex als business data default)
- `ReceptenTile.tsx` decoratief gradient patroon

## Bestanden overzicht

| Actie | Bestand |
|-------|---------|
| Bewerkt | `src/index.css` (4 shadow CSS vars) |
| Bewerkt | `tailwind.config.ts` (boxShadow extend) |
| Bewerkt | `src/components/polar/NestoCard.tsx` |
| Bewerkt | `src/components/polar/StatCard.tsx` |
| Bewerkt | `src/components/polar/FormSection.tsx` |
| Bewerkt | `src/components/polar/NestoSelect.tsx` |
| Bewerkt | `src/components/polar/CategorySidebar.tsx` |
| Bewerkt | `src/components/polar/NestoBadge.tsx` |
| Bewerkt | `src/lib/nestoToast.tsx` |
| Bewerkt | `src/components/layout/NestoSidebar.tsx` |
| Bewerkt | `src/components/onboarding/MessageThread.tsx` |
| Bewerkt | `src/components/reserveringen/ReservationListView.tsx` |
| Bewerkt | `src/components/dashboard/ReservationsTile.tsx` |
| Bewerkt | `src/pages/Dashboard.tsx` |

Totaal: 14 bestanden gewijzigd, 0 nieuw, 0 verwijderd.

## Validatie
Na afloop mag `grep` in `src/components/` (excl. `ui/`) geen resultaten meer tonen voor:
- `rgba(` in inline styles of Tailwind arbitrary values (behalve ReceptenTile patroon)
- `bg-white`
- `text-[#` hex kleuren
- Inline `style={{ boxShadow` op cards
