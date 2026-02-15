

# Sidebar: smooth single-expand mechaniek

## Wat verandert

| Aspect | Nu | Straks |
|--------|-----|--------|
| Expand mechaniek | Radix `Collapsible.Root` met data-state animaties | Eigen `max-height` + `overflow: hidden` + cubic-bezier transition |
| State | `expandedGroups: string[]` (meerdere open) | `expandedModule: string | null` (single-expand) |
| Chevron | `rotate-180` bij open | `rotate(90deg)` bij open, zelfde 0.2s transition |
| Wisseling | Twee aparte open/dicht acties | Een vloeiende wisseling: oude dicht + nieuwe open tegelijk |

## Technische aanpak

### `src/components/layout/NestoSidebar.tsx`

1. **State vereenvoudigen**
   - `expandedGroups: string[]` wordt `expandedModule: string | null`
   - `useEffect` voor route-sync wordt simpeler: zet `expandedModule` op de groep van het actieve pad

2. **Radix Collapsible verwijderen**
   - Geen `Collapsible.Root`, `Collapsible.Trigger`, `Collapsible.Content` meer
   - Import van `@radix-ui/react-collapsible` verwijderen

3. **Eigen expand container**
   - De sub-items wrapper krijgt een `ref` (useRef) om de werkelijke hoogte te meten
   - Inline style: `maxHeight` op `0` (dicht) of `scrollHeight + "px"` (open)
   - CSS transition: `max-height 0.2s cubic-bezier(0.4, 0, 0.2, 1)`, `overflow: hidden`

4. **Single-expand logica**
   - Klik op parent: als `expandedModule === item.id` dan `null`, anders `item.id`
   - Omdat er maar een state variabele is, klapt de oude automatisch dicht (max-height naar 0) terwijl de nieuwe opent -- een vloeiende wisseling

5. **Chevron**
   - Van `rotate-180` naar `rotate-90` bij open
   - Zelfde `transition-transform duration-200` met cubic-bezier easing

6. **Route-sync**
   - Bij navigatie: `expandedModule` wordt automatisch de groep van het actieve pad
   - Als een actief child in een groep zit, blijft die groep open (niet dichtklappen)

Alleen `src/components/layout/NestoSidebar.tsx` wordt aangepast.
