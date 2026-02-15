

# WCAG 2.1 AA Accessibility Fixes

## Scope
6 bestanden worden aangepast. Geen andere bestanden worden geraakt.

## Stap 1: Focus states herstellen — NestoSidebar.tsx

De sidebar heeft op 2 plaatsen `focus-visible:outline-none focus-visible:ring-0` (regels 81 en 91), wat focus volledig verbergt.

**Fix:** Vervang in beide gevallen door `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.

Daarnaast: de interactieve menu-buttons (expandable trigger regel 155, sub-items regel 196, regular items regel 224) missen focus-visible classes. Voeg `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` toe aan elk.

**Controle NestoButton, NestoInput, NestoSelect, NestoTabs:**
- NestoButton: heeft al correcte `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` -- OK
- NestoInput: heeft `focus:!border-primary focus:outline-none focus:ring-0` -- dit is een bewuste keuze (border-focus in plaats van ring), consistent met form inputs. Laten staan.
- NestoSelect: zelfde als NestoInput -- OK
- NestoTabs: heeft al correcte `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` -- OK

## Stap 2: Skip-to-content link — AppLayout.tsx

Voeg bovenaan de root div een verborgen skip-link toe:
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:rounded-button">
  Ga naar inhoud
</a>
```

Voeg `id="main-content"` toe aan de page content div (regel 70).

## Stap 3: Aria attributen

### SearchBar.tsx (clear button)
Voeg `aria-label="Zoekopdracht wissen"` toe aan de clear button (regel 45).

### NestoTabs.tsx
- Tab container `nav` heeft al `aria-label="Tabs"` -- voeg `role="tablist"` toe (regel 31)
- Elke tab button: voeg `role="tab"` en `aria-selected={isActive}` toe (regel 36)

### NestoModal.tsx
De DialogContent van ShadCN gebruikt al `aria-labelledby` en `aria-describedby` via Radix Dialog primitives. Geen wijziging nodig.

## Stap 4: Kleurcontrast — index.css

`--text-tertiary: 220 4% 68%` op witte achtergrond:
- HSL(220, 4%, 68%) = circa #AAABAE
- Contrast ratio tegen wit (#FFF): ~2.7:1 -- **FAALT** voor normal text (4.5:1 vereist)

**Fix:** Wijzig naar `220 4% 46%` (circa #707276), wat een contrast ratio van ~5.3:1 geeft -- passeert AA.

## Bestanden overzicht

| Bestand | Wijziging |
|---------|-----------|
| `src/components/layout/NestoSidebar.tsx` | Focus states herstellen op 5 buttons |
| `src/components/layout/AppLayout.tsx` | Skip-to-content link + id="main-content" |
| `src/components/polar/SearchBar.tsx` | aria-label op clear button |
| `src/components/polar/NestoTabs.tsx` | role="tablist", role="tab", aria-selected |
| `src/index.css` | --text-tertiary lightness 68% naar 46% |

NestoModal.tsx wordt NIET aangepast (Radix Dialog regelt aria al correct).

Totaal: 5 bestanden, geen visuele regressies buiten betere focus-ringen en iets donkerder tertiaire tekst.

