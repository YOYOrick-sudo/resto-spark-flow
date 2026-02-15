

# Sidebar sub-menu: animatie fix

## Het probleem

De huidige `ExpandableContent` heeft een bug in de close-animatie:

1. Na het openen wordt `maxHeight` op `'none'` gezet (via `onTransitionEnd`) zodat dynamische content niet geklipt wordt
2. Bij dichtklappen gaat het van `none` naar `0px` — maar de browser kan niet animeren vanaf `none`, dus het springt direct dicht

## De fix

Bij het sluiten moet er eerst de huidige `scrollHeight` als numerieke waarde worden gezet, en pas in het volgende frame `0px`. Zo heeft de browser een startwaarde om vanaf te animeren.

| Stap | Nu | Straks |
|------|-----|--------|
| Openen | `0px` naar `scrollHeight` naar `none` | Identiek |
| Sluiten | `none` naar `0px` (geen animatie!) | `none` naar `scrollHeight` (1 frame) naar `0px` (geanimeerd) |

## Technisch (alleen `NestoSidebar.tsx`, regels 8-38)

De `ExpandableContent` component wordt aangepast:

- Bij `isOpen` false: eerst `scrollHeight + "px"` zetten, dan via `requestAnimationFrame` naar `"0px"`
- Dit geeft de browser een concreet startpunt voor de transition
- Geen andere bestanden, geen visuele of gedragswijzigingen

