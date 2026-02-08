

## TableModal professioneler maken + modal standaard vastleggen

### Analyse

De HOOFDLETTERS in labels komen van twee bronnen:
1. **`src/index.css`** regel 268-273: de `.text-label` class heeft `text-transform: uppercase`
2. **`src/components/polar/FormSection.tsx`** regel 74: `FormField` heeft `uppercase tracking-wide`

Dit is een **globale wijziging** -- niet alleen de TableModal, maar ALLE NestoInput labels en FormField labels in de hele app gaan naar sentence case.

### Wijzigingen

**Bestand 1: `src/index.css`** (regel 268-273)
- Verwijder `text-transform: uppercase` en `letter-spacing: 0.5px` uit `.text-label`
- Vervang door: `font-size: 13px; font-weight: 500; letter-spacing: 0;`
- Dit raakt alle NestoInput labels app-breed

**Bestand 2: `src/components/polar/FormSection.tsx`** (regel 74)
- `FormField` label: verwijder `uppercase tracking-wide`
- Wordt: `text-[13px] font-medium text-muted-foreground`

**Bestand 3: `src/components/settings/tables/TableModal.tsx`**
- Herstructureer het formulier in 3 secties met dividers
- Sectie 1 (Identificatie): Tafelnummer + Label grid-cols-2 (geen label nodig)
- Sectie 2 (Capaciteit): divider `border-t border-border/50 pt-4 mt-4`, sectie label "Capaciteit", Min + Max grid-cols-2
- Sectie 3 (Instellingen): divider `border-t border-border/50 pt-4 mt-4`, sectie label "Instellingen", toggles
- Verwijder de volledige "Beschikbaarheid" sectie (regels 195-215) inclusief de Clock en NestoBadge imports
- Buttons: `gap-2` wordt `gap-3`, `justify-end` is al correct
- Modal size: voeg `size="md"` toe (= `max-w-lg`, al de default maar expliciet maken)

**Bestand 4: `docs/design/CARD_SHADOWS.md`** (of nieuw bestand `docs/design/MODAL_PATTERNS.md`)
- Maak nieuw bestand `docs/design/MODAL_PATTERNS.md` met de modal standaard:
  - Labels: sentence case, nooit uppercase
  - Groepering: secties gescheiden door `border-t border-border/50 pt-4 mt-4`
  - Sectie labels: `text-sm font-medium text-foreground`
  - Buttons: rechts uitgelijnd (`flex justify-end gap-3`), "Annuleren" (outline) links, primaire actie rechts
  - Geen "Coming soon" placeholders in modals
  - Default size: `md` (max-w-lg)

### Overzicht impact

| Bestand | Wijziging |
|---|---|
| `src/index.css` | `.text-label` uppercase verwijderd (globaal) |
| `FormSection.tsx` | `FormField` uppercase verwijderd (globaal) |
| `TableModal.tsx` | 3 secties met dividers, beschikbaarheid verwijderd, buttons gap-3 |
| `docs/design/MODAL_PATTERNS.md` | Nieuw: modal standaard voor alle toekomstige modals |
