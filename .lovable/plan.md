

## Verticale spacing verkleinen

Nu de tekst en iconen kleiner zijn, is de verticale padding per item te ruim. De `py-[7px]` wordt verlaagd naar `py-[5px]` op alle navigatie-items.

### Wijzigingen in `src/components/layout/NestoSidebar.tsx`

Alle `py-[7px]` worden `py-[5px]` op de volgende plekken:

- **Regel 160** — Expandable group button
- **Regel 188** — Disabled sub-item
- **Regel 201** — Active/normal sub-item
- **Regel 219** — Disabled hoofditem
- **Regel 229** — Regular link item

Dit maakt de navigatie compacter en beter in verhouding met de kleinere tekst en iconen.

