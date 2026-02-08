

## Sidebar header iconen verfijnen

De iconen moeten eleganter: groter maar met dunnere lijnen, outline stijl (Linear/Vercel look).

### Wijzigingen in `src/components/layout/NestoSidebar.tsx`

**Zap icoon (regel 89):**
- Verwijder `fill="currentColor"`
- `strokeWidth={2}` -> `strokeWidth={1.5}`
- `size={18}` -> `size={20}`
- `color="#17171C"` blijft

**PanelLeft icoon (regel 98):**
- `strokeWidth={2}` -> `strokeWidth={1.5}`
- `size={18}` -> `size={20}`
- `color="#17171C"` blijft

| Eigenschap | Huidig | Nieuw |
|---|---|---|
| size | 18 | 20 |
| strokeWidth | 2 | 1.5 |
| fill (Zap) | currentColor | verwijderd |
| color | #17171C | #17171C |

