

## Dashboard Redesign — Rustiger en Compacter

### Samenvatting

Het dashboard wordt visueel rustiger: minder tekst, meer ademruimte, sneller scanbaar. Vijf concrete wijzigingen in een enkel bestand.

### Wijzigingen in `src/pages/Dashboard.tsx`

**1. Greeting in plaats van H1 titel**

Vervang `<h1>Dashboard</h1>` door een flex row:
- Links: greeting op basis van `new Date().getHours()`:
  - `< 12` → "Goedemorgen"
  - `12-17` → "Goedemiddag"
  - `>= 18` → "Goedenavond"
  - Styling: `text-2xl font-semibold text-foreground`
- Rechts: datum in formaat "zo 8 feb" via `toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })`
  - Styling: `text-sm text-muted-foreground`

**2. Stat Cards compacter**

`DashboardStat` component vereenvoudigen:
- Verwijder `zeroLabel` en `subLabel` props
- Card padding: `p-4` (was `p-5`)
- Label: `text-sm text-muted-foreground` (was `text-[13px] font-medium`)
- Getal: `text-xl font-semibold` (was `text-2xl`)
- Waarde 0: toon "—" in `text-xl font-semibold text-muted-foreground`, geen extra tekst eronder
- Waarde > 0: toon getal in `text-xl font-semibold text-foreground`, geen subtitel
- Icoon container blijft: `w-9 h-9 rounded-lg bg-primary/5`
- Grid gap: `gap-3` (was `gap-4`)

**3. Signalen — max 2, single-line**

- `.slice(0, 2)` in plaats van `.slice(0, 3)`
- Elk signaal wordt een enkele regel: severity icoon (geen ronde achtergrond, gewoon icoon `h-4 w-4` met kleur) + titel (`text-sm font-medium flex-1`) + module badge + ChevronRight
- Verwijder de beschrijving (`item.message` wordt niet meer getoond)
- Verwijder de ronde icoon-container (`w-8 h-8 rounded-full`), gebruik het icoon direct
- Elke regel: `flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors`
- Klikbaar via `onClick` naar `action_path` (al aanwezig)

**4. Reserveringen — compacter**

- Header label: "Vandaag" (was "Reserveringen vandaag")
- `.slice(0, 4)` in plaats van `.slice(0, 5)`
- Per rij: alleen tijd (`text-sm font-medium w-14`) en naam (`text-sm flex-1 truncate`)
- Verwijder: gasten/tafel info, status dot
- Verwijder imports: `reservationStatusConfig` (niet meer nodig)
- Lege state: `py-6` (was `py-8`)

**5. Spacing**

- Parent container: `space-y-8` (was `space-y-6`)

### Technische details

| Aspect | Oud | Nieuw |
|---|---|---|
| Titel | `<h1>Dashboard</h1>` | Greeting + datum |
| Stat card padding | `p-5` | `p-4` |
| Stat card getal | `text-2xl` + subtitel | `text-xl`, geen subtitel |
| Grid gap | `gap-4` | `gap-3` |
| Signalen max | 3 | 2 |
| Signaal layout | Twee regels + icoon container | Single line, icoon direct |
| Reserveringen max | 5 | 4 |
| Reservering rij | Tijd + naam + gasten + tafel + dot | Tijd + naam |
| Sectie spacing | `space-y-6` | `space-y-8` |

### Bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/Dashboard.tsx` | Greeting, compactere stat cards, 2 signalen single-line, 4 reserveringen zonder details, meer spacing |

