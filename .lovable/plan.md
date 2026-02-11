

# NestoCard border — Eerst testen op Shifts pagina

## Aanpak

In plaats van direct het globale `NestoCard` component aan te passen, voegen we de border eerst alleen toe op de Shifts pagina. Zo kun je het beoordelen en finetunen voordat het systeem-breed wordt uitgerold.

## Hoe

Op de Shifts settings pagina (`SettingsReserveringenShifts.tsx`) worden drie NestoCard-instanties gebruikt:
1. **Shift overzicht** card
2. **Uitzonderingen** card (via `ShiftExceptionsSection`)
3. **Live Preview** panel

We voegen op elk van deze cards een extra `className="border border-border"` toe. Dit overschrijft niets in het component zelf — het is puur een lokale toevoeging.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/settings/reserveringen/SettingsReserveringenShifts.tsx` | `border border-border` toevoegen aan Shift overzicht NestoCard |
| `src/components/settings/shifts/exceptions/ShiftExceptionsSection.tsx` | `border border-border` toevoegen aan Uitzonderingen NestoCard |
| `src/components/settings/shifts/ShiftsLivePreviewPanel.tsx` | `border border-border` toevoegen aan Preview NestoCard |

## Na goedkeuring

Als de border goed staat, verplaatsen we de styling naar `NestoCard.tsx` zelf (1 regel) en verwijderen we de lokale className overrides. Dan werkt het automatisch overal.

