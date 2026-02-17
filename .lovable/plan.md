

# PanelDemo: Resterende Design System Afwijkingen

## Wat klopt al
- Buttons gebruiken NestoButton met correcte varianten (primary=16px, outline/ghost=8px)
- Stepper +/- buttons gebruiken `rounded-control` (6px) -- correct voor mini controls
- Label styling `text-[13px] font-medium text-muted-foreground` -- correct
- Padding p-5 -- correct per panel spec
- tabular-nums op gast counter -- correct

## Wat niet klopt

### 1. Badges: raw spans i.p.v. NestoBadge

**Huidige situatie:** 3 badges zijn handmatig gebouwd met `rounded-full` (volledig rond).

| Badge | Huidig | Moet zijn |
|-------|--------|-----------|
| "Bevestigd" (regel 92) | `rounded-full` + handmatige kleuren | `NestoBadge variant="success" dot` |
| "VIP" (regel 98) | `rounded-full` + amber kleuren | `NestoBadge variant="warning" size="sm"` |
| "Verjaardag" (regel 101) | `rounded-full` + muted kleuren | `NestoBadge variant="default" size="sm"` |

Per design system: badges gebruiken `rounded-control` (6px), niet `rounded-full`.

### 2. Inputs: verkeerde border-radius

**Huidige situatie:** Alle inputs en faux-inputs gebruiken `rounded-control` (6px).

Per BORDER_RADIUS.md: **inputs = `rounded-button` (8px)**.

Betreft:
- Datum & tijd velden (regels 198, 202)
- Naam input (regel 258)
- Telefoon input (regel 267)
- E-mail input (regel 275)
- Notities textarea (regel 287)

### 3. Shift toggle buttons: verkeerde border-radius

**Huidige situatie:** Lunch/Diner toggles gebruiken `rounded-control` (6px).

Dit zijn outline toggle buttons, geen mini controls. Per design system: **outline buttons = `rounded-button` (8px)**.

### 4. Focus ring: niet conform enterprise pattern

**Huidige situatie:** `focus:ring-2 focus:ring-ring focus:ring-offset-1`

Per enterprise functional patterns: **`focus-visible:ring-1 focus-visible:ring-primary/30`** (subtieler, alleen bij keyboard navigatie).

Betreft alle input, textarea, en shift toggle elementen.

## Wijzigingen

Bestand: `src/pages/PanelDemo.tsx`

### 1. Import NestoBadge toevoegen
Toevoegen: `import { NestoBadge } from '@/components/polar/NestoBadge'`

### 2. Status badge "Bevestigd" (regel 92-95)
Vervang de raw span door:
```
<NestoBadge variant="success" dot className="mt-3">Bevestigd</NestoBadge>
```

### 3. VIP en Verjaardag tags (regels 97-104)
Vervang door:
```
<div className="flex flex-wrap gap-1.5 mt-3">
  <NestoBadge variant="warning" size="sm">
    <Star className="h-3 w-3" /> VIP
  </NestoBadge>
  <NestoBadge size="sm">
    Verjaardag
  </NestoBadge>
</div>
```

### 4. Alle `rounded-control` op inputs/textareas wijzigen naar `rounded-button`
Betreft 7 elementen (regels 198, 202, 238, 258, 267, 275, 287).

### 5. Focus ring patroon bijwerken
Op alle inputs en textarea:
`focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1` wordt `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30`

