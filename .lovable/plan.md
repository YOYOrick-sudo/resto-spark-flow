
# Betere card-scheiding: gap en schaduw verhogen

## Wat is het probleem

Alle NestoCards op de Widget settings pagina (en andere settings pagina's) vloeien visueel in elkaar over. Dit heeft twee oorzaken:

**Oorzaak 1: Te weinig ruimte tussen cards**
De `space-y-6` wrapper geeft slechts 24px tussen elke card. Dat is te weinig om de cards als aparte "objecten" te zien.

**Oorzaak 2: Te zwakke schaduw**
De huidige `shadow-card` token (`0 1px 3px rgba(0,0,0,0.08)`) is bijna onzichtbaar op de lichtgrijze pagina-achtergrond (`#F3F4F6`). Daardoor ogen de cards als één aaneengesloten vlak.

---

## Oplossing

### 1. Shadow-card token versterken (globaal)

In `src/index.css` de `--shadow-card` token aanpassen naar een iets zwaardere schaduw die op een lichtgrijze achtergrond goed zichtbaar is:

```
Huidig: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)
Nieuw:  0 1px 4px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)
```

Dit is een kleine maar merkbare verbetering — cards "zweven" nu zichtbaar boven de achtergrond. Heeft effect op alle NestoCards in het hele project.

### 2. Gap tussen cards verhogen (widget pagina)

In `SettingsReserveringenWidget.tsx` de wrapper van `space-y-6` naar `space-y-5` verhogen — dat samen met de betere schaduw geeft voldoende visuele scheiding.

Wait — de pagina heeft al `space-y-6`. Het probleem zit in de cards zelf die te dicht op de pagina-achtergrond liggen. De juiste fix is dus:

- De gap van `space-y-6` → `space-y-8` (32px ipv 24px) op de widget pagina wrapper
- En de shadow versterken zoals beschreven

### 3. Card border zichtbaarder maken

Naast de schaduw heeft de NestoCard nu `border-border/50` (halve opacity van de border kleur). Die is te subtiel. Aanpassen naar `border-border/70` geeft een zichtbaardere rand zonder het clean design te verstoren.

---

## Technisch overzicht

### `src/index.css`
```css
/* Huidig */
--shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);

/* Nieuw */
--shadow-card: 0 1px 4px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
```

### `src/components/polar/NestoCard.tsx`
```tsx
/* Huidig */
"border border-border/50 shadow-card"

/* Nieuw */
"border border-border/70 shadow-card"
```

### `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx`
```tsx
/* Wrapper van alle cards */
<div className="space-y-6">  →  <div className="space-y-8">
```

---

## Effect

- Cards zijn nu duidelijk van elkaar te onderscheiden als aparte "secties"
- De shadow geeft een subtiel maar merkbaar "zwevend" effect boven de grijze pagina-achtergrond
- De iets sterkere border benadrukt de kaartgrenzen
- Dit is een globale fix — alle settings pagina's profiteren hiervan automatisch
- Geen logica-wijzigingen, geen database

**Bestanden:** `src/index.css`, `src/components/polar/NestoCard.tsx`, `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx`
