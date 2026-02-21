

# TitleHelp info-iconen toevoegen aan settings secties

## Wat verandert

Zeven settings-pagina's krijgen een info-icoon (i) achter de paginatitel. Dit is hetzelfde patroon dat al gebruikt wordt bij Shifts, Pacing, Locatie, Shift Tijden en Communicatie. Geen nieuwe componenten, geen database, geen dependencies.

## Pagina's en help-teksten

| Pagina | Help-titel | Uitleg |
|--------|-----------|--------|
| **Areas** | Wat zijn areas? | Ruimtes in je restaurant (bijv. terras, zaal). Elke area bevat tafels met eigen capaciteit. |
| **Tafelcombinaties** | Wat zijn tafelcombinaties? | Groepeer tafels die samen geboekt kunnen worden voor grotere gezelschappen. |
| **Tickets** | Wat zijn tickets? | Reserveringsproducten die gasten zien en boeken. Elk ticket heeft eigen regels, capaciteit en prijs. |
| **Beleid** | Wat is beleid? | Annulerings- en betalingsbeleid dat je aan tickets koppelt. Bepaal of gasten een aanbetaling doen. |
| **Notificaties** | Hoe werken notificaties? | Automatische berichten naar gasten bij bevestiging, herinnering en annulering. |
| **Widget** | Wat is de widget? | De publieke boekingswidget die gasten gebruiken om online te reserveren. |
| **Onboarding** | Wat is onboarding? | Het inwerkproces voor nieuwe medewerkers. Configureer fases, taken en communicatie. |

## Technisch

Elke pagina krijgt dezelfde wijziging:

1. Import `TitleHelp` (en optioneel `TitleHelpTip`)
2. Wrap de `title` prop in `<span className="flex items-center gap-2">` met een `<TitleHelp>` component

**Bestanden:**
- `src/pages/settings/reserveringen/SettingsReserveringenTafelsAreas.tsx`
- `src/pages/settings/reserveringen/SettingsReserveringenTafelsGroepen.tsx`
- `src/pages/settings/reserveringen/SettingsReserveringenTickets.tsx`
- `src/pages/settings/reserveringen/SettingsReserveringenBeleid.tsx`
- `src/pages/settings/reserveringen/SettingsReserveringenNotificaties.tsx`
- `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx`
- `src/pages/settings/SettingsOnboarding.tsx`

Geen database wijzigingen. Geen nieuwe componenten.
