

# Sidebar: smooth single-expand mechaniek

## Wat verandert

| Aspect | Nu | Straks |
|--------|-----|--------|
| Expand mechaniek | Radix `Collapsible` met data-state animaties (schokkerig) | Eigen `max-height` + `overflow: hidden` + cubic-bezier transition (vloeiend) |
| State | `expandedGroups: string[]` (meerdere open mogelijk) | `expandedModule: string / null` (single-expand) |
| Chevron | `rotate-180` bij open | `rotate(90deg)` bij open, zelfde 0.2s transition |
| Wisseling | Twee aparte open/dicht acties | Een vloeiende wisseling: oude dicht + nieuwe open tegelijk |

## Technische aanpak in `src/components/layout/NestoSidebar.tsx`

1. **State vereenvoudigen**
   - `expandedGroups: string[]` wordt `expandedModule: string | null`
   - Initialisatie: `getExpandedGroupFromPath(location.pathname)` of `null`

2. **Radix Collapsible verwijderen**
   - Import `* as Collapsible from '@radix-ui/react-collapsible'` weg
   - Geen `Collapsible.Root`, `Collapsible.Trigger`, `Collapsible.Content` meer

3. **Eigen expand container**
   - Per expandable groep een `useRef<HTMLDivElement>` voor de sub-items wrapper
   - Inline style: `maxHeight` op `"0px"` (dicht) of `scrollHeight + "px"` (open)
   - Inline style: `transition: "max-height 0.2s cubic-bezier(0.4, 0, 0.2, 1)"`, `overflow: "hidden"`
   - Een helper component `ExpandableContent` die de ref + hoogte-meting afhandelt

4. **Single-expand logica**
   - Klik op parent trigger: `setExpandedModule(prev => prev === item.id ? null : item.id)`
   - Omdat er maar een state variabele is, klapt de oude automatisch dicht (max-height naar 0) terwijl de nieuwe opent -- een vloeiende, synchrone wisseling

5. **Chevron**
   - Van `rotate-180` naar `rotate-90` bij open
   - Transition: `transition-transform duration-200` met `ease-[cubic-bezier(0.4,0,0.2,1)]`

6. **Route-sync useEffect**
   - Simpeler: `setExpandedModule(getExpandedGroupFromPath(location.pathname))`
   - De oude timeout-logica verdwijnt

7. **Active child override**
   - Als `hasActiveChild` true is voor een groep, wordt die groep altijd als "open" behandeld zodat je niet per ongeluk een actieve pagina verbergt

Alleen `src/components/layout/NestoSidebar.tsx` wordt aangepast. Geen andere bestanden.

