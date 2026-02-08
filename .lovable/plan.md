

## Zap icoon filled maken

Het Zap icoon mist nog `fill="currentColor"`. Dit moet worden toegevoegd zodat het bliksemicoon solid/filled is, zoals in de referentie-afbeelding.

### Wijziging

**Bestand:** `src/components/layout/NestoSidebar.tsx`, regel 86

Huidige code:
```tsx
<Zap size={20} strokeWidth={1.5} color="#17171C" />
```

Nieuwe code:
```tsx
<Zap size={20} strokeWidth={1.5} color="#17171C" fill="currentColor" />
```

Het PanelLeft icoon blijft ongewijzigd (outline).
