
# Cards net iets scherper onderscheiden

## Twee micro-aanpassingen

### 1. Border: /70 → volledig opaque

De NestoCard heeft nu `border-border/70` — 70% opacity van de border kleur. Die border is nog steeds iets "weggedrukt". Volledig opaque (`border-border`, geen opacity) geeft een net iets scherpere rand zonder het design agressief te maken.

### 2. Shadow: iets meer diepte

De huidige `shadow-card` token:
```
0 1px 4px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)
```

Eén stap zwaarder:
```
0 1px 4px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.08)
```

De Y-offset van de tweede laag gaat van `8px` naar `10px` en de opacity van `0.06` naar `0.08`. Dit is een subtiele maar merkbare verbetering — cards lijken iets meer te "zweven" boven de grijze achtergrond.

---

## Bestanden

- **`src/index.css`** — `--shadow-card` token iets zwaarder
- **`src/components/polar/NestoCard.tsx`** — `border-border/70` → `border-border`

Geen logica, geen database, alleen twee waarden.
