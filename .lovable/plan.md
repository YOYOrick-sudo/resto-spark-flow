

# Analytics Pagina Herindelen

## Probleem

De huidige tabs (Marketing, Social, Reviews, Waste, Reserveringen, Keuken) zijn een vlakke lijst zonder logische groepering. Een restauranteigenaar denkt niet in "marketing vs social" maar in domeinen: "Hoe zit het met mijn online zichtbaarheid?" of "Hoe efficiënt is mijn keuken?"

## Nieuwe structuur

Groepeer de tabs in **drie logische categorieën** met visuele scheiding:

```text
┌─────────────────────────────────────────────────────────┐
│  Online & Gasten          │  Keuken & Inkoop            │
│  ┌──────┐ ┌──────┐ ┌───┐ │  ┌─────┐ ┌──────────────┐   │
│  │Bereik│ │Review│ │Res│ │  │Waste│ │Keuken (soon)│   │
│  └──────┘ └──────┘ └───┘ │  └─────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Categorie 1: Online & Gasten** — alles wat met je zichtbaarheid en gasten te maken heeft
- **Bereik** (was: Marketing + Social samengevoegd) — campagnes, social media, engagement
- **Reviews** — beoordelingen, sentiment, respons
- **Reserveringen** (binnenkort)

**Categorie 2: Keuken & Inkoop** — operationele efficiëntie
- **Waste** — verspilling en kosten
- **Keuken** (binnenkort)

### Wat verandert er inhoudelijk?

**Marketing + Social worden samengevoegd tot "Bereik"**: beide gaan over online zichtbaarheid. De tab toont eerst de Marketing sectie (campagnes, email stats), dan de Social sectie (platforms, bereik, posts) — als twee secties onder elkaar in dezelfde tab. Geen data gaat verloren, het wordt alleen logischer gepresenteerd.

## UI Design

In plaats van een platte tab-bar, gebruik **gegroepeerde tabs met subtiele categorie-labels**:

```text
Analytics — Strategisch inzicht over al je modules

ONLINE & GASTEN                    KEUKEN & INKOOP
[Bereik]  [Reviews]  Reserveringen  │  [Waste]  Keuken
                     (binnenkort)   │          (binnenkort)
```

- Kleine uppercase labels boven elke groep (`text-[11px] uppercase tracking-wider text-muted-foreground`)
- Verticale divider (`border-l`) tussen de groepen
- Tabs zelf blijven dezelfde stijl als nu

## Wijzigingen

| Bestand | Actie |
|---|---|
| `src/pages/analytics/AnalyticsPage.tsx` | Herschrijven — gegroepeerde tab-bar, "Bereik" tab |
| `src/pages/analytics/tabs/BereikTab.tsx` | Nieuw — combineert Marketing + Social als twee secties |
| `src/pages/analytics/tabs/MarketingAnalyticsTab.tsx` | Behouden (wordt als sectie geïmporteerd door BereikTab) |
| `src/pages/analytics/tabs/SocialAnalyticsTab.tsx` | Behouden (wordt als sectie geïmporteerd door BereikTab) |

### AnalyticsPage.tsx details
- Tab groepen als data-structuur met `group` label
- Render twee groepen naast elkaar met divider
- Tabs: `bereik`, `reviews`, `waste` (enabled) + `reservations`, `kitchen` (disabled)
- URL param `?tab=bereik` wordt de default

### BereikTab.tsx details
- Rendert `<MarketingAnalyticsTab />` en `<SocialAnalyticsTab />` onder elkaar
- Met een visuele scheiding (heading of divider) ertussen
- Eigen periode-selector die naar beide doorgeeft (of elke sectie behoudt zijn eigen)

