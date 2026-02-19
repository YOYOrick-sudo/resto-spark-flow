

# Fix: Doorschemerende tafels + te donkere overlay

## Probleem 1: Tafels zichtbaar door overlay

De sticky kolom-elementen in de Grid View (area headers, tafelnamen) gebruiken `z-[60]`. De NestoPanel overlay zit ook op `z-[60]`. Gelijk z-niveau betekent dat DOM-volgorde bepaalt wat "wint" — en de grid elementen staan eerder in de DOM, maar door sticky positioning blijven ze zichtbaar.

**Fix:** NestoPanel overlay en panel van `z-[60]` naar `z-[70]` tillen. Dit dekt alle grid-elementen af.

## Probleem 2: Overlay te donker

We hebben eerder `bg-black/40` ingesteld. Het design system (MODAL_PATTERNS.md) schrijft voor:
- `bg-black/20 backdrop-blur-sm`
- Lichtere overlay met blur voor een moderne, cleanere look

**Fix:** Overlay terugzetten naar `bg-black/20 backdrop-blur-sm` conform design system.

## Wijzigingen

### `src/components/polar/NestoPanel.tsx` — 2 regels

**Regel 111 (overlay):**
```
Was:  z-[60] bg-black/40 backdrop-blur-[2px]
Wordt: z-[70] bg-black/20 backdrop-blur-sm
```

**Regel 116 (panel container):**
```
Was:  z-[60]
Wordt: z-[70]
```

## Z-index overzicht na fix

| Element | Z-index |
|---------|---------|
| Reserveringsblokken | z-10 |
| Sticky headers (timeline, pacing, areas) | z-[45] |
| NU-lijn container | z-50 |
| Sticky left-column cellen | z-[60] |
| **NestoPanel overlay + panel** | **z-[70]** |

## Scope

- 1 bestand, 2 regels
- Geen Grid View wijzigingen
- Geen Sheet/SheetContent wijzigingen
- Alle panels profiteren automatisch

