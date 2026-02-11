

# TaskTemplateList -- Enterprise compliance fix

## Wat er niet klopt

| Issue | Standaard | Huidig | Fix |
|-------|-----------|--------|-----|
| Raw `<input>` | Verboden, gebruik base components | `<input>` HTML element | Vervangen door gestylde component met correcte 1.5px border + teal focus |
| Opacity modifier | `/60` verboden op labels | `text-muted-foreground/60` | `text-muted-foreground` |
| Header alignment | Kolommen moeten matchen | Header `auto`, data `w-[240px]` | Beide dezelfde grid: `grid-cols-[1fr_240px_32px]` |
| SelectTrigger | 1.5px border, bg-card, teal focus | Default ShadCN styling | Enterprise input styling toevoegen |

## Wijzigingen in TaskTemplateList.tsx

### 1. Grid fix -- vaste kolommen voor alignment
```
// Header EN data rows krijgen dezelfde grid:
grid-cols-[1fr_240px_32px]
```
Dit zorgt dat "Uitvoering" exact boven de rol-dropdown/assistent-toggle staat.

### 2. Input styling -- enterprise conform
Vervang raw `<input>` door een gestylde input met de correcte Nesto tokens:
- `border-[1.5px] border-border` (zichtbare border)
- `bg-card` achtergrond
- `focus:border-[#1d979e]` teal focus-border
- Geen focus ring/glow/offset

### 3. SelectTrigger -- enterprise input styling
```
className="h-7 w-[120px] text-xs border-[1.5px] border-border bg-card focus:border-[#1d979e]"
```

### 4. Opacity fix
```
// Was:
text-muted-foreground/60
// Wordt:
text-muted-foreground
```

## Bestand
Alleen `src/components/onboarding/settings/TaskTemplateList.tsx` wijzigt.

