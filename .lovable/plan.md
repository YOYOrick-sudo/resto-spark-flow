

# Switch component: Premium polish

## Wat er nu is
De transitie is al verbeterd naar `200ms ease-in-out`, maar het voelt nog steeds als een standaard toggle. Premium SaaS producten (Linear, Vercel) gebruiken subtiele extra details die het verschil maken.

## Verbeteringen

### 1. Betere easing curve
Vervang `ease-in-out` door een custom `cubic-bezier(0.4, 0, 0.2, 1)` — dit is de Material Design "standard" curve die een snellere start en zachtere landing geeft. Voelt natuurlijker dan symmetrisch ease-in-out.

### 2. Thumb "lift" effect bij checked state
Voeg een subtiele schaduw toe aan de thumb wanneer checked: `data-[state=checked]:shadow-md`. Dit geeft het gevoel dat de thumb "omhoog" komt wanneer actief — een klein maar merkbaar kwaliteitssignaal.

### 3. Checked track met subtiele inner shadow
Voeg `data-[state=checked]:shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]` toe aan de root voor een subtiel diepte-effect op de teal track.

### 4. Duration naar 250ms
Net iets langer (250ms i.p.v. 200ms) geeft meer "weight" aan de transitie — het voelt deliberaat in plaats van snel.

## Technisch

### `src/components/ui/switch.tsx`

**Root:**
- `transition-all duration-200 ease-in-out` wordt `transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]`
- Toevoegen: `data-[state=checked]:shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]`

**Thumb:**
- `transition-all duration-200 ease-in-out` wordt `transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]`
- Toevoegen: `data-[state=checked]:shadow-md`

### `src/components/settings/tables/SortableTableRow.tsx`
Geen extra wijzigingen nodig — de mini-switch erft de verbeterde base styling.

## Overige Switch-locaties
Alle 7 andere locaties (ReminderSettingsSection, PhaseConfigCard, TaskTemplateList, TableModal 2x, TableGroupModal) erven automatisch van de base component.

## Resultaat
Een switch die voelt als Linear/Vercel: vloeiend, met subtiel diepte-effect, en een natuurlijke bewegingscurve die premium aanvoelt.

