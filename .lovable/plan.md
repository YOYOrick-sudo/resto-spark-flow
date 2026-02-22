

# Marketing Dashboard KPI cards — gelijktrekken met Reviews

## Huidige situatie

**Reviews pagina** (het gewenste patroon):
```
StatCard label="Google score" value="4.2" unit="/5" icon={Star}
StatCard label="Totaal reviews" value={42} icon={MessageSquare}
StatCard label="Response rate" value={85} unit="%" icon={CheckCircle2}
StatCard label="Recente reviews" value={12}
```
Compact, uniform, minimalistisch. Allemaal via het `StatCard` component.

**Marketing dashboard** (huidige situatie):
4 custom `NestoCard` blokken met:
- Inline sparkline chart (omzet)
- Info tooltip met hover
- "Bekijk analytics" link
- Conditionele error-kleur
- "Win-back sturen" button
- Flow namen lijstje

Te druk, inconsistent met de rest van het platform.

---

## Wijziging

Vervang de 4 custom KPI `NestoCard` blokken (regels 103-242) door 4 `StatCard` componenten in een grid:

| Card | label | value | unit | icon |
|------|-------|-------|------|------|
| 1 | Marketing omzet | `EUR X.XXX` (formatted) | | Euro |
| 2 | Gasten bereikt | count | | Users |
| 3 | At-risk gasten | count | | AlertTriangle |
| 4 | Actieve flows | count | | Zap |

### Wat verdwijnt
- Sparkline chart in omzet card (te druk voor een KPI overzicht)
- Info tooltip met de EUR 35 uitleg
- "Bekijk analytics" link (de analytics pagina is al bereikbaar via navigatie)
- "Win-back sturen" button (bereikbaar via Campagnes)
- Flow namen lijst onder het getal
- Alle custom `!p-0` / `!p-6` overrides

### Wat blijft
- Het 4-koloms grid layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)
- Loading states (StatCard krijgt value van skeleton of het getal)
- De rest van de pagina (WeekplanCard, CoachingTips, BrandIntelligence, Campaigns tabel, Activity timeline) blijft identiek

---

## Technische details

| Bestand | Actie |
|---|---|
| `src/pages/marketing/MarketingDashboard.tsx` | Edit: vervang regels 103-242 (4 NestoCard blokken) door 4 StatCard componenten. Voeg `StatCard` import toe, verwijder ongebruikte imports (`AreaChart`, `Area`, `ResponsiveContainer`, `Tooltip` van recharts, `Info`, `UITooltip`, `cn`). Verwijder `sparklineTooltip` functie en `AVG_REVENUE_PER_GUEST` constante. |

Eén bestand, eén sectie, netto minder code.

