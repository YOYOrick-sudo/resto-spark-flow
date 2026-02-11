
# Shifts pagina — Enterprise visuele upgrade

## Probleem

De Shifts-pagina mist het "enterprise" gevoel dat het dashboard wel heeft. Specifieke issues:

1. **Tabelkop te vaag**: `text-muted-foreground/70` (70% opacity op al gedempte kleur) maakt headers nauwelijks leesbaar
2. **Geen rijscheiding**: Shift-rijen vloeien in elkaar over zonder duidelijke grenzen
3. **Tekst te licht**: Tijden, intervallen en dag-labels zijn te bleek door overmatig gebruik van `text-muted-foreground`
4. **Geen echte tabel-structuur**: Het is een grid met losse divs zonder visuele samenhang — geen header-achtergrond, geen row-dividers
5. **Prioriteit-badge te subtiel**: `bg-muted/60` is nauwelijks zichtbaar
6. **Card-headers**: Section titles ("Shift overzicht", "Uitzonderingen") missen een duidelijke scheiding van de content

## Oplossing

De tabel omvormen naar een enterprise-grade data display met duidelijke hiërarchie, betere contrasten en professionele scheiding tussen rijen.

### Wijzigingen per bestand

**1. `ShiftsTable.tsx` — Tabelkop en structuur**
- Tabelkop: `text-muted-foreground/70` wordt `text-muted-foreground` (volle kleur, niet 70%)
- Voeg een achtergrondkleur toe aan de header-rij: `bg-muted/40 rounded-lg px-3 py-2`
- Separator onder header: `bg-border/50` wordt `bg-border`
- Row spacing: `space-y-0.5` wordt `space-y-0` met `divide-y divide-border/50` voor duidelijke rijscheiding (of border-bottom per rij)

**2. `SortableShiftRow.tsx` — Rij-styling en tekstcontrast**
- Tijden: `text-sm font-medium` wordt `text-sm font-semibold text-foreground` — duidelijk leesbaar
- Dash tussen tijden: `text-muted-foreground` wordt `text-muted-foreground/60` (de dash mag subtiel, de tijden niet)
- Shift naam: al `font-semibold`, goed zo
- Short name badge: `bg-secondary` wordt `bg-muted` met sterkere tekst
- Interval: `text-muted-foreground` wordt `text-foreground/70` — iets sterker
- Prioriteit-badge: `bg-muted/60` wordt `bg-muted` met `border border-border/60` voor meer definitie
- Dag-labels actief: `bg-primary/12 text-primary` wordt `bg-primary/15 text-primary font-bold` — duidelijker actieve dagen
- Bottom border per rij: `border-b border-border/40` toevoegen voor rijscheiding
- Verwijder de transparante `border border-transparent hover:border-border/40` en vervang door permanente bottom-border

**3. `SettingsReserveringenShifts.tsx` — Card header scheiding**
- Voeg `border-b border-border pb-5` toe aan de header-div (met h3 en p) zodat "Shift overzicht" duidelijk gescheiden is van de tabel

**4. `ShiftExceptionsSection.tsx` — Zelfde header scheiding**
- Header div ("Uitzonderingen" + beschrijving + knoppen): voeg `border-b border-border pb-5` toe

## Visueel resultaat

```text
VOOR:                           NA:
- Vage kolomkoppen              - Duidelijke kolomkoppen op bg-muted
- Rijen zonder scheiding        - Rijen met subtiele border-bottom
- Tijden in lichte kleur        - Tijden in volle foreground kleur
- Prio-badge nauwelijks         - Prio-badge met border
  zichtbaar                     - Card headers met border-bottom
- Headers vloeien in content    - Professionele tabel-feel
```

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/settings/shifts/ShiftsTable.tsx` | Header achtergrond, sterkere tekst, betere separator |
| `src/components/settings/shifts/SortableShiftRow.tsx` | Tekstcontrast, rijscheiding, badge definitie |
| `src/pages/settings/reserveringen/SettingsReserveringenShifts.tsx` | Card header border-bottom |
| `src/components/settings/shifts/exceptions/ShiftExceptionsSection.tsx` | Header border-bottom |

Puur visueel, geen functionele wijzigingen.
