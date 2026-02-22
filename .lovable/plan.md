

# Sessie 1.8 — Analytics Herstructurering + WhatsApp Kanaal Fix

Twee onderdelen: (1) analytics naar centraal platform verplaatsen, (2) SMS vervangen door WhatsApp in contacten UI.

---

## 1. Route wijzigingen

### Verwijderen
- `/marketing/analytics` route uit `src/App.tsx` (regel 140)
- `marketing-analytics` uit `ROUTE_MAP` in `src/lib/navigation.ts` (regel 33)

### Toevoegen
- `/analytics` route in `src/App.tsx` met nieuw `AnalyticsPage` component
- `analytics` entry in `ROUTE_MAP`: `'analytics': '/analytics'`

---

## 2. Navigatie (`src/lib/navigation.ts`)

### Marketing sub-items (regel 115-121)
Verwijder "Analytics" sub-item. Marketing behoudt 4 sub-items:
- Dashboard (`/marketing`)
- Campagnes (`/marketing/campagnes`)
- Segmenten (`/marketing/segmenten`)
- Contacten (`/marketing/contacten`)

### Analytics top-level menu-item
Voeg "Analytics" toe als nieuw top-level item in de OPERATIE sectie, direct NA het marketing blok:

| Eigenschap | Waarde |
|---|---|
| id | `analytics` |
| label | Analytics |
| icon | `BarChart3` |
| path | `/analytics` |
| section | `OPERATIE` |

### getExpandedGroupFromPath (regel 195-212)
Geen aanpassing nodig. `/analytics` is geen expandable group, het valt in de default `null` return.

---

## 3. Bestanden herstructurering

### Nieuw: `src/pages/analytics/AnalyticsPage.tsx`
- `PageHeader` met titel "Analytics"
- `NestoTabs` met 3 tabs:
  - "Marketing" (id: `marketing`, enabled, default actief)
  - "Reserveringen" (id: `reservations`, disabled: true)
  - "Keuken" (id: `kitchen`, disabled: true)
- NestoTabs ondersteunt al `disabled` met `cursor-not-allowed opacity-50` styling
- Disabled tabs krijgen extra tooltip "Binnenkort beschikbaar" via wrapping
- Rendert `MarketingAnalyticsTab` als actieve tab `marketing` is

### Nieuw: `src/pages/analytics/tabs/MarketingAnalyticsTab.tsx`
- Exacte content uit huidige `MarketingAnalytics.tsx` (regels 15-178):
  - Periode selector (`NestoOutlineButtonGroup`)
  - Revenue hero card met schatting-tooltip
  - Email metrics line chart (Recharts)
  - Campagne performance tabel
  - Loading/empty states
- Importeert `useMarketingAnalytics` (pad ongewijzigd)

### Verwijderen: `src/pages/marketing/MarketingAnalytics.tsx`

---

## 4. Marketing Dashboard aanpassing (`src/pages/marketing/MarketingDashboard.tsx`)

In de Marketing omzet KPI tile (regel 78-128), voeg onder de sparkline een "Bekijk analytics" link toe:
- `text-xs text-muted-foreground hover:text-foreground` met `ArrowUpRight` icon
- Navigeert naar `/analytics`

---

## 5. App.tsx route wijzigingen

- Verwijder: `import MarketingAnalytics` (regel 48) en `/marketing/analytics` route (regel 140)
- Toevoeg: `import AnalyticsPage` van `src/pages/analytics/AnalyticsPage` en `/analytics` route binnen het protected layout blok

---

## 6. SMS -> WhatsApp kanaal fix

### `src/components/marketing/contacts/ContactOptInSheet.tsx` (regel 14-17)
CHANNELS array wijzigen van:
```
{ key: 'email', label: 'E-mail' },
{ key: 'sms', label: 'SMS' },
```
Naar:
```
{ key: 'email', label: 'E-mail' },
{ key: 'whatsapp', label: 'WhatsApp', disabled: true },
```

Rendering aanpassen (regel 44-66): als `ch.disabled` is `true`:
- Switch wordt `disabled` met tooltip "Beschikbaar na WhatsApp koppeling"
- Toggle is niet klikbaar
- Subtekst toont "Beschikbaar na WhatsApp koppeling" in plaats van consent bron

### `src/lib/settingsRouteConfig.ts` (regel 118)
Wijzig beschrijving van "E-mail en SMS instellingen" naar "E-mail instellingen" (of "E-mail en WhatsApp instellingen" als je wilt vooruitlopen).

---

## Bestanden overzicht

| Bestand | Actie |
|---------|-------|
| `src/pages/marketing/MarketingAnalytics.tsx` | Verwijderen |
| `src/pages/analytics/AnalyticsPage.tsx` | Nieuw |
| `src/pages/analytics/tabs/MarketingAnalyticsTab.tsx` | Nieuw (content uit oude MarketingAnalytics) |
| `src/lib/navigation.ts` | Analytics top-level toevoegen, marketing-analytics verwijderen |
| `src/App.tsx` | Route `/analytics` toevoegen, `/marketing/analytics` verwijderen |
| `src/pages/marketing/MarketingDashboard.tsx` | "Bekijk analytics" link toevoegen |
| `src/components/marketing/contacts/ContactOptInSheet.tsx` | SMS -> WhatsApp (disabled) |
| `src/lib/settingsRouteConfig.ts` | SMS uit beschrijving |

## Wat NIET verandert

- `useMarketingAnalytics.ts` -- ongewijzigd (alleen import pad vanuit nieuwe tab)
- `useMarketingDashboard.ts` -- ongewijzigd
- Marketing dashboard KPI tiles -- ongewijzigd (behalve link toevoeging)
- Attribution engine -- ongewijzigd
- Database schema -- geen wijzigingen
- Alle overige marketing pagina's -- ongewijzigd

## Toekomstig patroon

Wanneer een nieuwe module analytics krijgt:
1. Maak `src/pages/analytics/tabs/ReservationsAnalyticsTab.tsx`
2. Enable de tab in `AnalyticsPage.tsx`
3. Klaar -- geen refactoring nodig

WhatsApp toggle wordt enabled wanneer Fase 4.14/6A WhatsApp integratie gebouwd wordt.

