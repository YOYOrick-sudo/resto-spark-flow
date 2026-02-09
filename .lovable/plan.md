

# Pre-build Checklist toevoegen aan Component Decision Guide

## Wat

Een nieuwe **Sectie 0: Pre-build Checklist** bovenaan `docs/design/COMPONENT_DECISION_GUIDE.md` -- een korte, afrekenbare lijst die doorlopen wordt voordat een nieuw component of module gebouwd wordt.

## Checklist inhoud

De checklist bevat 8 vragen, gegroepeerd in drie categorieen:

**Containers & Layout**
1. Gebruik ik `NestoCard` (met juiste variant) in plaats van een raw `<div>` voor kaarten/content blokken?
2. Gebruik ik `bg-secondary/50 border border-border/40` voor groeperings-zones (kolommen, lanes) -- nooit `bg-secondary/30` of lager?
3. Geen card-in-card nesting? Elke content-groep is een eigen NestoCard.

**Interactie**
4. Welke `NestoButton` variant past? (primary voor hoofdactie, outline voor secundair, danger voor destructief, ghost voor toolbar)
5. Maximaal 1 primary button per zichtbaar scherm, rechts-uitgelijnd?
6. Formuliervelden via `NestoInput` / `NestoSelect` / `NestoModal` -- nooit raw HTML inputs?

**Feedback**
7. Welk feedback patroon? Toast voor expliciete acties, inline error voor validatie, ConfirmDialog voor destructief, EmptyState voor lege data.
8. Badges via `NestoBadge` met semantische variant (success/pending/error) -- nooit shadcn Badge rechtstreeks?

## Hoe het actief gebruikt wordt

Bovenaan de checklist komt een opmerking dat deze lijst bij **elke nieuwe module, pagina of component** doorlopen moet worden voordat er code geschreven wordt. Dit wordt ook vastgelegd als instructie in het document zelf, zodat het bij elke toekomstige bouwopdracht geraadpleegd wordt.

## Wijziging

| Bestand | Actie |
|---------|-------|
| `docs/design/COMPONENT_DECISION_GUIDE.md` | Pre-build Checklist als eerste sectie toevoegen (onderdeel van het volledige document dat nog aangemaakt moet worden) |

Dit wordt meegenomen wanneer het volledige document wordt aangemaakt -- er verandert niets aan de eerder goedgekeurde secties, er komt alleen een sectie 0 bovenaan bij.

