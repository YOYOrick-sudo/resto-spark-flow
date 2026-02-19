

# Premium Pill Button — Brand-driven met glassmorphism

## Wat verandert

De huidige vlakke knop (solid teal, 10px radius) wordt een **premium pill** die de brand kleuren van elk restaurant overneemt, met een glaseffect dat het onderscheidt van de concurrent.

## Visuele vergelijking

```text
Huidig (Nesto Polar)              Nieuw (Premium Pill)
┌──────────────────────┐           ┌───────────────────────────┐
│                      │           │                           │
│    Reserveer         │           │   ●  Reserveer            │
│                      │           │                           │
│  solid, 10px radius  │           │  pill (50px), glass inset │
│  minimal shadow      │           │  brand color, accent dot  │
└──────────────────────┘           └───────────────────────────┘
```

## Wijzigingen overzicht

| Eigenschap | Huidig | Nieuw |
|---|---|---|
| Border radius | `10px` | `50px` (pill) |
| Achtergrond | Solid `color` | Solid `color` (brand kleur restaurant) |
| Glaseffect | Geen | `inset 0 0 0 1px rgba(255,255,255,0.15)` |
| Schaduw (rust) | `0 1px 3px ..., 0 4px 14px ...` | `0 2px 8px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)` + inset glass |
| Schaduw (hover) | `0 2px 6px ..., 0 8px 24px ...` | `0 4px 12px rgba(0,0,0,0.15), 0 12px 32px rgba(0,0,0,0.12)` + inset glass |
| Accent dot | Geen | `8px` gevulde cirkel links (`rgba(255,255,255,0.7)`) |
| Padding | `12px 24px` (desktop) | `14px 28px` (desktop), `12px 22px` (mobiel) |
| Letter spacing | `0.01em` | `0.02em` |
| Hover lift | `translateY(-1px)` | `translateY(-2px)` |
| Icoon/SVG variabelen | Kalender SVG constanten (ongebruikt) | Verwijderd |

## Onderscheidend van concurrent (gouden knop)
1. Gebruikt de **eigen brand kleur** van het restaurant, niet een vaste kleur
2. **Glasrand** (inset white border) geeft diepte die de concurrent niet heeft
3. **Accent dot** in plaats van een icoon - cleaner en unieker
4. **Sentence case** ("Reserveer") past bij Nesto's typografie
5. **Hover animatie** met lift en schaduwverandering (concurrent is statisch)

## Technisch

Enige bestand: `public/widget.js`

1. Verwijder ongebruikte `CALENDAR_ICON` en `CALENDAR_ICON_SM` constanten
2. Update shadow variabelen met glassmorphism inset border
3. Button styling: `border-radius: 50px`, genereuzer padding, `letter-spacing: 0.02em`
4. Voeg accent dot toe als `<span>` element (8px cirkel, `rgba(255,255,255,0.7)`) voor de tekst
5. Hover: `translateY(-2px)` met zwaardere schaduw
6. Behoud alle bestaande functionaliteit (panel, preload, pulse, etc.)

