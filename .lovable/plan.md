

# Fix Command Palette — Dubbel probleem + Enterprise restyling

## Problemen

1. **Dubbele instantie**: Twee `NestoSidebar` renderings = twee `CommandPalette` + twee `⌘K` listeners
2. **Styling botst met design system**:
   - Input heeft `focus-visible:ring-2` (ShadCN default) in plaats van 1.5px teal border
   - Items gebruiken `rounded-md` en `bg-muted` hover — generiek, niet Nesto Polar
   - Geen verfijnde radius tokens (`rounded-dropdown` ontbreekt)
   - Group headings missen de juiste spacing en stijl
   - Geen subtiele entry-animatie die "licht" aanvoelt

## Oplossing

### 1. Centraliseer in AppLayout

**`NestoSidebar.tsx`**:
- Verwijder `CommandPalette` render, `commandOpen` state, en `⌘K` useEffect
- Voeg `onSearchClick?: () => void` prop toe
- Zoekknop roept `onSearchClick?.()` aan

**`AppLayout.tsx`**:
- Voeg `commandOpen` state + `⌘K` listener toe (eenmalig)
- Render een enkele `CommandPalette`
- Geef `onSearchClick` door aan beide sidebar instanties

### 2. Restyle `command.tsx` naar Nesto Polar

**CommandDialog container**:
- `rounded-card` (16px) in plaats van `rounded-lg`
- Subtielere shadow: `shadow-lg` voor diepte zonder zwaarte
- Snellere, lichtere animatie: `duration-100` met `slide-in-from-top-1` (kleiner, sneller)

**CommandInput**:
- Verwijder `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Vervang door `border-[1.5px] border-border focus:border-primary focus:ring-0` (Nesto standaard)
- `rounded-button` (8px) voor het input veld
- `bg-secondary` achtergrond voor contrast met de card

**CommandItem**:
- `rounded-button` (8px) in plaats van `rounded-md`
- Hover/selected: `data-[selected='true']:bg-accent/60` (subtiel, consistent met sidebar hover)
- Actieve teal accent: `data-[selected='true']:text-foreground` blijft, maar achtergrond wordt zachter

**CommandGroup headings**:
- `px-3 pt-4 pb-1.5` voor betere spacing tussen groepen
- `text-[11px] tracking-widest uppercase text-muted-foreground/60` — exact zoals sidebar section labels

**CommandList**:
- `px-1.5 pb-1.5` — compacter, minder waste

**CommandEmpty**:
- `text-muted-foreground` kleur toevoegen

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/ui/command.tsx` | Volledige restyling van alle sub-componenten |
| `src/components/layout/NestoSidebar.tsx` | CommandPalette + state + listener verwijderen, `onSearchClick` prop |
| `src/components/layout/AppLayout.tsx` | `commandOpen` state, `⌘K` listener, enkele `CommandPalette` render |

## Visueel resultaat

```text
+------------------------------------------+
|  [Q] Zoeken in nesto...                  |   <-- 1.5px border, teal focus, bg-secondary
+------------------------------------------+
|                                          |
|  OPERATIE                                |   <-- 11px uppercase, muted/60
|    [icon] Dashboard                      |   <-- rounded-button, bg-accent/60 hover
|    [icon] Reserveringen                  |
|                                          |
|  KEUKEN                                  |
|    [icon] Recepten                       |
|    [icon] Ingrediënten                   |
|                                          |
+------------------------------------------+
```

Alles in lijn met de sidebar section labels, input styling en hover states die al in het project bestaan.

