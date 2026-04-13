

# Waste Dashboard Tile + Waste Overzicht naar Analytics

## 1. Waste Dashboard Tile

Nieuwe component `src/components/dashboard/WasteTile.tsx` in dezelfde stijl als de bestaande tiles (ReservationsTile, KeukenTile, ReceptenTile).

**Design:**
- NestoCard met `overflow-hidden !p-0` (zoals ReservationsTile) voor edge-to-edge chart
- Header: "Waste" label + ArrowUpRight hover icon
- Hero metric: totale waste kosten deze week (`€XX.XX`) met label "deze week"
- Visualisatie: kleine BarChart (hoogte ~120px) met dagelijkse waste kosten, edge-to-edge
  - Bar fill: `hsl(var(--error))` met opacity gradient
  - Geen XAxis/YAxis labels, alleen Tooltip
- Footer onder `border-t`: top waste categorie als signaal (bijv. "Bederf is 40% van waste")
- Klik navigeert naar `/analytics` (waste tab)

**Data:** Gebruikt `useWasteRegistraties` hook met huidige week range.

**Dashboard integratie:** Toevoegen in `src/pages/Dashboard.tsx` grid (4e tile). Grid wordt `lg:grid-cols-4` bij 4 tiles, of we houden `lg:grid-cols-3` en laten de 4e tile wrappen — afhankelijk van hoe het eruitziet. Ik ga voor `lg:grid-cols-2 xl:grid-cols-4` zodat het altijd mooi past.

## 2. Waste Tab opsplitsen

**WasteTab (`src/components/inkoop/WasteTab.tsx`):**
- Verwijder WasteOverzicht import en sectie
- Houd alleen WasteRegistreerForm

**Analytics pagina (`src/pages/analytics/AnalyticsPage.tsx`):**
- Voeg "Waste" tab toe aan TABS array (enabled, niet disabled)
- Render `WasteOverzicht` component wanneer waste tab actief is
- WasteOverzicht component blijft ongewijzigd — wordt gewoon vanuit Analytics gerenderd

## Bestanden

| Bestand | Actie |
|---|---|
| `src/components/dashboard/WasteTile.tsx` | Nieuw |
| `src/pages/Dashboard.tsx` | Wijzigen — WasteTile toevoegen aan grid |
| `src/components/inkoop/WasteTab.tsx` | Wijzigen — alleen registratieformulier |
| `src/pages/analytics/AnalyticsPage.tsx` | Wijzigen — Waste tab toevoegen |

