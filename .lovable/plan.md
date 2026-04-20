

## Huidige code (ModuleSubNav.tsx, regel 89-105)

```tsx
className={cn(
  "relative flex items-center gap-2 px-4 min-h-[44px] text-sm font-medium whitespace-nowrap rounded-md transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  isActive
    ? "text-primary"
    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
)}
```

Active = `text-primary` + onderlijn-spanne (regel 109-114, `bg-primary`).
Hover (non-active) = `hover:text-foreground hover:bg-accent/50` ← veroorzaakt de pill + flash.

## Fix

**Eén className-wijziging op regel 95:**

```diff
- : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
+ : "text-muted-foreground hover:text-foreground"
```

Verwijder ook `rounded-md` (regel 91) — niet meer nodig zonder bg-pill, en voorkomt visuele suggestie van een button-shape. Active onderlijn (regel 109-114, `absolute left-3 right-3 -bottom-px h-0.5 bg-primary rounded-full`) blijft ongewijzigd.

`transition-colors` blijft staan: het animeert nu alleen `color`, geen `background-color` → geen flash meer bij snelle muisbeweging.

**Nieuwe classNames (regel 89-96):**
```tsx
className={cn(
  "relative flex items-center gap-2 px-4 min-h-[44px] text-sm font-medium whitespace-nowrap transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  isActive
    ? "text-primary"
    : "text-muted-foreground hover:text-foreground"
)}
```

## Tokens (geen hex)

We gebruiken bestaande semantische tokens — `text-muted-foreground` (default), `text-foreground` (hover), `text-primary` (active). Geen `text-gray-600/900` of `text-teal-600` hardcoden — die respecteren dark-mode niet en breken de design-token conventie van het project.

## iPad / touch

Voor iPad-tap-highlight: standaard browser-tap-highlight kan een korte flash geven. Optioneel `[-webkit-tap-highlight-color:transparent]` toevoegen aan de NavLink className. **Voorstel:** wel toevoegen — past bij touch-only context (Pura Vida iPad aan de muur).

## Verificatie

1. Hover over `/voorraad` tab: tekst gaat van muted naar foreground, géén grijze pill achter de tab
2. Snelle muisbeweging over alle tabs: geen background-flash (alleen color-transition)
3. Active tab (`/voorraad`): teal onderlijn blijft zichtbaar, tekst blijft `text-primary`
4. Tab via Tab-key navigeren: focus-ring blijft werken (`focus-visible:ring-2`)
5. iPad tap: geen blauwe/grijze tap-highlight flash
6. Dark mode: hover gaat van muted naar foreground, beide tokens werken automatisch
7. `npx tsc --noEmit` groen (alleen className-wijziging, geen type-impact)

## Te wijzigen bestand

- `src/components/polar/ModuleSubNav.tsx` — regel 91 (verwijder `rounded-md`), regel 95 (verwijder `hover:bg-accent/50`), optioneel regel 90 (`[-webkit-tap-highlight-color:transparent]` toevoegen)

## Out of scope

- Geen wijzigingen aan andere componenten (sidebar, NestoButton, ViewToggle, etc.) — die houden hun eigen hover-patroon
- Geen wijziging aan active-state onderlijn of kleur
- Geen wijziging aan fade-edges of overflow-scroll gedrag

