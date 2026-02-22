

# Fix: AssistantFilters dubbele rand + Design Patroon Documentatie

## Probleem

De `AssistantFilters` module-knoppen gebruiken nog het oude `border-[1.5px] border-primary` patroon. Dit moet consistent worden met de rest van de app.

## Twee patronen in de app

Er zijn twee correcte selectie-patronen, elk voor een ander doel:

### Patroon 1: Toggle Buttons (inline knoppen, periode selectors)
Gebruikt in: ViewToggle, DensityToggle, NestoOutlineButtonGroup

| Staat | Klassen |
|---|---|
| Selected | `bg-primary/10 text-primary border border-primary/20 shadow-sm` |
| Unselected | `text-muted-foreground hover:text-foreground hover:bg-background/50` |

Geen `border-[1.5px]`, geen opaque `border-primary`. Subtiel en licht.

### Patroon 2: Settings Navigation (sidebar menu items)
Gebruikt in: SettingsPageLayout categorieën sidebar

| Staat | Klassen |
|---|---|
| Selected | `bg-selected-bg border-selected-border text-primary font-semibold border-[1.5px]` |
| Unselected | `text-muted-foreground bg-transparent border-transparent hover:bg-accent/60 border-[1.5px]` |

Dit gebruikt de semantische `selected-bg` / `selected-border` tokens. De `border-[1.5px]` is hier correct omdat het navigatie-items zijn in een settings sidebar, niet inline toggles.

## Wijziging

### `src/components/assistant/AssistantFilters.tsx` (regels 42-48)

Dit zijn inline toggle-knoppen (Patroon 1). Fix:

Van:
```
"border-[1.5px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
isSelected
  ? "bg-primary/10 border-primary text-primary"
  : "bg-transparent border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
```

Naar:
```
"focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
isSelected
  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
  : "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
```

### Design documentatie

Nieuw bestand: `docs/design/SELECTION_STATES.md`

Documenteert de twee patronen zodat toekomstige componenten het juiste patroon kiezen:
- Toggle Buttons: `border border-primary/20 shadow-sm`
- Settings Navigation: `border-[1.5px] border-selected-border bg-selected-bg`

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `src/components/assistant/AssistantFilters.tsx` | Fix toggle styling |
| `docs/design/SELECTION_STATES.md` | Nieuw - patroon documentatie |

