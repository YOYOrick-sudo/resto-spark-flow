

# Plan — Sidebar logo: wordmark uitgeklapt, ring-icon ingeklapt

## Wat je wilt
- **Sidebar uitgeklapt** → toon `shouf` wordmark (zwarte tekst), zelfde visuele grootte als waar voorheen "nesto" tekst stond.
- **Sidebar ingeklapt** → toon de bordeaux ring-icon (`shouf-icon.png`).

## Onderzoek nodig
Eerst checken hoe de sidebar logo render-call eruit ziet en welke size momenteel gebruikt wordt — zodat de wordmark op exact dezelfde hoogte uitlijnt als de oude "nesto" tekst.

Te lezen:
- `src/components/layout/NestoSidebar.tsx` (of vergelijkbaar) — vinden waar `<NestoLogo>` staat en met welke props
- `src/components/polar/NestoLogo.tsx` — huidige size-mapping (`md` = 26px lockup-hoogte, wordmark ongeknipt)

## Wijziging

### 1. Sidebar render-call aanpassen
In de sidebar-component conditioneel renderen:
```tsx
<NestoLogo
  size="md"
  showIcon={collapsed}
  showWordmark={!collapsed}
/>
```
- `collapsed=true` → alleen icon (ring) → past in smalle 56px-strip
- `collapsed=false` → alleen wordmark (`shouf` tekst) → vult de header zoals voorheen

### 2. `NestoLogo.tsx` size-tuning
De huidige `heightMap` (`md=26px`) is afgestemd op het oude SVG-logo. De nieuwe `shouf` PNG-wordmark heeft andere proporties (breder, dikker letterbeeld). Mogelijk moet `md` voor wordmark omhoog naar **~22-24px** zodat de visuele body-hoogte van "shouf" overeenkomt met de oude "nesto" tekst (16-18px x-height).

Voorstel: aparte hoogtes voor wordmark vs icon vs lockup:
```ts
const wordmarkHeightMap = { sm: 16, md: 22, lg: 28 };
const iconHeightMap     = { sm: 20, md: 26, lg: 32 };
const lockupHeightMap   = { sm: 22, md: 30, lg: 38 };
```

Exacte waardes finetunen na visuele check in preview.

## Bestandenoverzicht

| # | Actie | Bestand |
|---|---|---|
| 1 | EDIT | `src/components/polar/NestoLogo.tsx` — aparte size-maps per modus |
| 2 | EDIT | sidebar-component (waarschijnlijk `src/components/layout/NestoSidebar.tsx`) — `showIcon`/`showWordmark` koppelen aan `collapsed`-state |

## Wat NIET verandert
- Geen kleuren, geen tekst-strings, geen routes, geen DB
- Lockup-modus (icon+wordmark) blijft beschikbaar voor andere plekken (login, 404)
- Andere call-sites van `<NestoLogo />` blijven identiek werken

## Resultaat
- Uitgeklapt: zwart `shouf` woord op crème sidebar-bg, zelfde optische gewicht als oude nesto-text
- Ingeklapt: bordeaux ring-icon, gecentreerd in de smalle strip

