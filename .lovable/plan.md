

## Dashboard Redesign — Module Tiles

### Samenvatting

Het dashboard wordt volledig herstructureerd naar een schaalbaar tile-based systeem. De vier stat cards en de reserveringenlijst worden vervangen door module tiles in een responsive grid. Een nieuw herbruikbaar component `DashboardModuleTile` wordt aangemaakt.

### Wijzigingen

**Nieuw bestand: `src/components/polar/DashboardModuleTile.tsx`**

Generiek, herbruikbaar tile component met deze props:

```
interface SecondaryMetric {
  label: string;
  value: string;
}

interface DashboardModuleTileProps {
  title: string;           // Module naam, bijv. "Reserveringen"
  heroValue: string;       // Hero getal, bijv. "20" of "—"
  heroLabel: string;       // Label onder hero, bijv. "vandaag"
  secondaryMetrics?: SecondaryMetric[];  // Max 2 key-value pairs
  linkTo: string;          // Route, bijv. "/reserveringen"
  linkLabel?: string;      // Default: "Bekijken"
}
```

Structuur van de tile:
- Wrapper: `NestoCard` (standaard shadow, default padding)
- Title: `text-sm font-medium text-muted-foreground`
- Hero value: `text-3xl font-semibold text-foreground` (of `text-muted-foreground` als "—")
- Hero label: `text-sm text-muted-foreground` direct onder hero
- Secundaire metrics: klein grid (`grid grid-cols-2 gap-x-4 gap-y-1 mt-4 pt-4 border-t border-border/50`), elke metric toont label (`text-xs text-muted-foreground`) en value (`text-sm font-medium text-foreground`)
- Footer link: `mt-4` met `Link` component, `text-sm text-primary hover:underline inline-flex items-center gap-1` + `ChevronRight h-3.5 w-3.5`
- De tile heeft `flex flex-col justify-between h-full` zodat alle tiles in een grid dezelfde hoogte hebben

**Bestand: `src/pages/Dashboard.tsx` — volledig herschrijven**

De pagina wordt opgebouwd uit drie secties:

**1. Header (geen card)**

- Flex row met greeting links en datum rechts
- Greeting: `getGreeting()` functie (bestaand) in `text-2xl font-semibold text-foreground`
- Datum: voluit formaat "zondag 8 februari" via `toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })` in `text-sm text-muted-foreground`

**2. Urgente signalen banner (conditioneel)**

- Alleen tonen als er `error` of `warning` signalen zijn in `mockAssistantItems`
- Styling: `bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3`
- Content: `Link` naar `/assistent` met `AlertTriangle` icoon (`h-4 w-4 text-orange-500`) + tekst "{n} signalen vereisen aandacht" (of "1 signaal vereist aandacht" voor enkelvoud) in `text-sm font-medium text-orange-800 dark:text-orange-200`
- Als 0 signalen: hele banner niet renderen

**3. Module tiles grid**

- Container: `mt-8` voor ademruimte onder header/banner
- Grid: `grid gap-4 grid-cols-1 sm:grid-cols-2` (2 kolommen voor 2-3 modules; later `lg:grid-cols-3` toevoegen wanneer er 4+ modules zijn)
- `items-stretch` zodat alle tiles dezelfde hoogte hebben

Tiles met mock data:

| Tile | title | heroValue | heroLabel | secondaryMetrics | linkTo |
|---|---|---|---|---|---|
| Reserveringen | "Reserveringen" | `todayReservations.length` of "—" | "vandaag" | `[{label: "bezetting", value: "98%"}, {label: "VIP", value: "2"}]` | "/reserveringen" |
| Keuken | "Keuken" | "—" | "open taken" | `[{label: "ingredienten", value: "12"}, {label: "onder minimum", value: "3"}]` | "/keuken/taken" |
| Recepten | "Recepten" | "—" | "actief" | geen | "/recepten" |

Data berekeningen:
- `todayReservations`: filter `mockReservations` op vandaag + niet cancelled (bestaande logica)
- Bezetting: berekend uit `totalGuests / totalCapacity * 100` (bestaande logica)
- VIP count: `todayReservations.filter(r => r.isVip).length`
- Keuken/Recepten: hardcoded "—" (nog geen data)

**Verwijderd:**
- `DashboardStat` sub-component
- Stat cards grid
- "Aandacht vereist" sectie met individuele signaalregels
- Reserveringen lijst NestoCard
- Imports: `NestoBadge`, severity/module configs, iconen die niet meer nodig zijn

### Technische details

| Aspect | Oud | Nieuw |
|---|---|---|
| Layout | Stat cards + signalen + reserveringenlijst | Header + banner + module tiles |
| Datum formaat | "zo 8 feb" | "zondag 8 februari" |
| Signalen | Max 2 regels met icoon/badge/chevron | 1 compacte banner met link |
| Reserveringen | Lijst met 4 rijen | Tile met hero getal |
| Schaalbaar | Nee (hardcoded 4 stat cards) | Ja (tiles toevoegen per module) |
| Componenten | DashboardStat (inline) | DashboardModuleTile (herbruikbaar) |

### Bestanden

| Bestand | Actie |
|---|---|
| `src/components/polar/DashboardModuleTile.tsx` | Nieuw — generiek tile component |
| `src/components/polar/index.ts` | Export toevoegen |
| `src/pages/Dashboard.tsx` | Herschrijven — header + banner + tiles |

