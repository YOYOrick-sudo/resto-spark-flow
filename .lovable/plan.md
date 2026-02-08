

## Dashboard Tiles Redesign — Polar-style Visualisaties

### Samenvatting

De drie dashboard tiles worden herontworpen zodat de visualisatie het dominante element is, geinspireerd door Polar.sh. De `DashboardModuleTile` component wordt vervangen door drie specifieke tile-componenten die elk een Recharts-visualisatie bevatten. Een documentatiebestand wordt aangemaakt.

### Wijzigingen

**1. Verwijder `src/components/polar/DashboardModuleTile.tsx`**

Dit generieke component wordt vervangen door een nieuw component met visualisatie-ondersteuning.

**2. Nieuw: `src/components/dashboard/ReservationsTile.tsx`**

Tile met AreaChart die de afgelopen 14 dagen toont.

- NestoCard met `className="overflow-hidden p-0"` (geen padding via variant, custom padding per sectie)
- Header zone: `px-6 pt-6` met "Reserveringen" links (`text-sm text-muted-foreground`) en `ArrowUpRight` icoon rechts als `Link` naar `/reserveringen`
- Hero zone: `px-6 mt-1` met getal (`text-4xl font-bold tracking-tight`) + "vandaag" (`text-sm text-muted-foreground ml-2`)
- Chart zone: direct eronder, `mt-4`, geen padding — chart loopt tot aan de linker-, rechter- en onderrand
- Chart specs:
  - `ResponsiveContainer` width="100%" height={120}
  - `AreaChart` met `margin={{ top: 0, right: 0, bottom: 0, left: 0 }}`
  - Data: 14 hardcoded datapunten met varierende counts
  - `defs` met `linearGradient` id="reservationGradient": stop offset="0%" `#1d979e` opacity 0.15, stop offset="100%" transparent
  - `Area` type="monotone" dataKey="count" stroke="#1d979e" strokeWidth={2} fill="url(#reservationGradient)"
  - Custom `dot` renderer: alleen op het laatste punt een cirkel met fill="#1d979e" r={4}
  - `Tooltip` met custom `content`: div met `bg-foreground text-background rounded-lg px-3 py-1.5 text-sm shadow-lg` — toont datum en "X reserveringen"
  - Geen `XAxis`, `YAxis`, `CartesianGrid`

**3. Nieuw: `src/components/dashboard/KeukenTile.tsx`**

Tile met horizontale progress bar.

- NestoCard met `className="overflow-hidden"` (standaard p-6)
- Header: "Keuken" + ArrowUpRight link naar `/keuken/taken`
- Hero: "8/12" in `text-4xl font-bold tracking-tight` + "MEP-taken" in `text-sm text-muted-foreground ml-2`
- Progress bar (`mt-4`):
  - Track: `h-3 w-full rounded-full bg-muted`
  - Fill: div met `h-full rounded-full` en `style={{ width: '67%', background: 'linear-gradient(90deg, #1d979e, #2BB4BC)' }}`
  - Labels eronder (`mt-2 flex justify-between`): "4 resterend" (`text-xs text-muted-foreground`) en "67%" (`text-xs font-medium text-primary`)
- Secundaire info (`mt-4 pt-4 border-t border-border/50`): oranje dot (`w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0`) + "3 ingredienten onder minimum" (`text-sm text-muted-foreground`)

**4. Nieuw: `src/components/dashboard/ReceptenTile.tsx`**

Tile met diagonale lijnen empty state.

- NestoCard met `className="overflow-hidden"` (standaard p-6)
- Header: "Recepten" + ArrowUpRight link naar `/recepten`
- Hero: "---" in `text-4xl font-bold text-muted-foreground tracking-tight`
- Patroon zone (`mt-4`): div met `h-20 rounded-lg` en inline style:
  - `backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px)'`
  - Dark mode variant via een extra overlay of CSS class

**5. Bewerk `src/pages/Dashboard.tsx`**

- Verwijder import van `DashboardModuleTile`
- Importeer de drie nieuwe tile components
- Grid: `grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch`
- Plaats `ReservationsTile` met `todayCount` en `isEmpty` props
- Plaats `KeukenTile` zonder props (hardcoded mock)
- Plaats `ReceptenTile` zonder props (hardcoded mock)
- Header en urgent banner blijven exact hetzelfde

**6. Bewerk `src/components/polar/index.ts`**

- Verwijder export van `DashboardModuleTile` en `DashboardModuleTileProps`

**7. Nieuw: `docs/design/DASHBOARD_TILES.md`**

Documentatie met:
- Tile structuur (header, hero, visualisatie)
- Reserveringen AreaChart specificaties (gradient, stroke, tooltip, edge-to-edge)
- Keuken progress bar specificaties (gradient fill, labels)
- Recepten empty state pattern
- Grid layout regels
- Kleurcodes (#1d979e, #2BB4BC)
- Dark mode overwegingen

### Mock data voor de chart

14 datapunten worden inline gedefinieerd in `ReservationsTile`:

```text
[
  { date: '26 jan', count: 12 },
  { date: '27 jan', count: 18 },
  { date: '28 jan', count: 15 },
  { date: '29 jan', count: 22 },
  { date: '30 jan', count: 8 },
  { date: '31 jan', count: 14 },
  { date: '1 feb', count: 19 },
  { date: '2 feb', count: 25 },
  { date: '3 feb', count: 11 },
  { date: '4 feb', count: 17 },
  { date: '5 feb', count: 21 },
  { date: '6 feb', count: 16 },
  { date: '7 feb', count: 23 },
  { date: '8 feb', count: 20 },
]
```

### Bestanden

| Bestand | Actie |
|---|---|
| `src/components/polar/DashboardModuleTile.tsx` | Verwijderen |
| `src/components/dashboard/ReservationsTile.tsx` | Nieuw |
| `src/components/dashboard/KeukenTile.tsx` | Nieuw |
| `src/components/dashboard/ReceptenTile.tsx` | Nieuw |
| `src/pages/Dashboard.tsx` | Bewerken -- nieuwe tile imports |
| `src/components/polar/index.ts` | Export verwijderen |
| `docs/design/DASHBOARD_TILES.md` | Nieuw -- design specificaties |

