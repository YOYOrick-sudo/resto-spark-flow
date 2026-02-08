

## Zap icoon corrigeren naar referentie

Het probleem is dat `fill="currentColor"` samen met `color="#17171C"` en `strokeWidth={1.5}` een dubbel effect geeft: zowel een dikke outline als een fill. In de referentie is het bliksemicoon een **clean solid shape** zonder zichtbare stroke eromheen.

### Wijziging

**Bestand:** `src/components/layout/NestoSidebar.tsx`, regel 86

Huidige code:
```tsx
<Zap size={20} strokeWidth={1.5} color="#17171C" fill="currentColor" />
```

Nieuwe code:
```tsx
<Zap size={20} strokeWidth={0} fill="#17171C" />
```

Door `strokeWidth={0}` te zetten en `fill="#17171C"` direct in te stellen, wordt het een zuiver gevulde shape zonder stroke-omlijning. Dit geeft het scherpe, solide resultaat zoals in de referentie.

Het PanelLeft icoon blijft ongewijzigd (outline met strokeWidth 1.5).

### Technisch detail

| Eigenschap | Huidig | Nieuw |
|---|---|---|
| strokeWidth | 1.5 | 0 |
| color | #17171C | verwijderd |
| fill | currentColor | #17171C |
| size | 20 | 20 (ongewijzigd) |

