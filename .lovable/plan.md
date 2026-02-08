

## Sidebar navigatie-items iets kleiner maken

De menu-items in de sidebar worden subtiel kleiner: zowel de tekst als de iconen schalen mee.

### Wijzigingen in `src/components/layout/NestoSidebar.tsx`

**Iconen bij hoofditems** — van `size={18}` naar `size={16}`:
- Expandable group items (regel 149)
- Disabled items (regel 193)
- Regular link items (regel 201)

**Tekst bij alle items** — van `text-sm` naar `text-[13px]`:
- Expandable group button (regel 145)
- Sub-items (regels 166, 175)
- Disabled items (regel 192)
- Regular link items (regel 198)

Dit houdt de verhouding icoon-tekst consistent en maakt de navigatie net iets compacter.

