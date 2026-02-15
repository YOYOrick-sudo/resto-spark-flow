

# Sidebar sub-menu: vloeiende open/dicht animatie

## Wat er verandert

Alleen de animatie-techniek van het uitklappen/inklappen wordt vervangen. Niets aan de visuele styling, layout, state-logica of het gedrag wijzigt.

| Aspect | Nu | Straks |
|--------|-----|--------|
| Animatie | Radix `Collapsible.Content` met `animate-collapsible-down/up` (abrupt, geen echte height-transitie) | Eigen `max-height` transitie met `overflow: hidden` en `cubic-bezier(0.4, 0, 0.2, 1)` (vloeiend) |
| Chevron | Identiek | Identiek (geen wijziging) |
| State logica | `expandedGroups[]` | Identiek (geen wijziging) |
| Visuele styling | Alles | Identiek (geen wijziging) |

## Technisch (alleen `NestoSidebar.tsx`)

1. Maak een klein helper-component `ExpandableContent` binnen hetzelfde bestand dat:
   - Een `ref` gebruikt om `scrollHeight` te meten
   - `max-height: 0` (dicht) of `scrollHeight + "px"` (open) als inline style zet
   - `overflow: hidden` en `transition: max-height 0.2s cubic-bezier(0.4, 0, 0.2, 1)` toepast

2. Vervang `Collapsible.Root` / `Collapsible.Trigger` / `Collapsible.Content` door:
   - De bestaande trigger-button (als gewone button, geen Radix wrapper)
   - `<ExpandableContent isOpen={...}>` om de sub-items heen

3. Verwijder de `import * as Collapsible` regel

Alles wat je nu ziet in de sidebar (kleuren, spacing, icons, chevron richting, active states, section labels, collapsed mode) blijft exact hetzelfde.

