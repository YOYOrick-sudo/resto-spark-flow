# Dashboard Tiles — Polar-style Visualisaties

## Structuur

Elke tile heeft drie zones: **header**, **hero metric**, en **visualisatie**. De visualisatie domineert het design.

### Header
- Module naam: `text-sm text-muted-foreground`
- Rechts: `ArrowUpRight` icoon als `Link` naar de module

### Hero
- Getal: `text-4xl font-bold tracking-tight`
- Label: `text-sm text-muted-foreground`

---

## Reserveringen Tile

AreaChart (Recharts) die 14 dagen toont, edge-to-edge.

- **Card**: `NestoCard` met `overflow-hidden !p-0`, custom padding per zone (`px-6 pt-6`)
- **Chart**: `ResponsiveContainer` height={120}, margin all 0
- **Gradient**: `linearGradient` van `#1d979e` opacity 0.15 → transparent
- **Stroke**: `#1d979e`, strokeWidth 2, type monotone
- **Dot**: alleen op laatste datapunt, fill `#1d979e`, r=4
- **Tooltip**: `bg-foreground text-background rounded-lg px-3 py-1.5 text-sm shadow-lg`
- **Geen**: XAxis, YAxis, CartesianGrid

---

## Keuken Tile

Progress bar met gradient fill.

- **Track**: `h-3 rounded-full bg-muted`
- **Fill**: `linear-gradient(90deg, #1d979e, #2BB4BC)`
- **Labels**: links "X resterend" (`text-xs text-muted-foreground`), rechts "X%" (`text-xs font-medium text-primary`)
- **Secundair**: oranje dot + waarschuwingstekst onder `border-t border-border/50`

---

## Recepten Tile (Empty State)

Diagonaal lijnenpatroon als empty state indicator.

- **Pattern**: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px)`
- **Hoogte**: `h-20 rounded-lg`
- **Dark mode**: `dark:opacity-[0.4]`

---

## Grid Layout

- `grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch`
- `mt-8` onder header/banner
- Toekomst: `lg:grid-cols-3` bij 4+ modules

## Kleuren

| Kleur | Hex | Gebruik |
|-------|-----|---------|
| Primary teal | `#1d979e` | Chart stroke, gradient, dots |
| Primary hover | `#2BB4BC` | Progress bar gradient end |
