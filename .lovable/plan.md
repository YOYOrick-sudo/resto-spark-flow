
# Section-Level FieldHelp Iconen in Alle Settings Pages

## Wat verandert

Elke kaart/sectie binnen settings pages krijgt een info-icoon (i) naast de sectie-titel. Dit maakt elke individuele sectie zelf-documenterend, niet alleen de pagina als geheel. Dit wordt het standaard patroon voor alle toekomstige settings secties.

## Aanpak

We gebruiken het bestaande `FieldHelp` component (kleiner, inline) voor sectie-headers binnen kaarten, en `TitleHelp` blijft voor paginatitels. Dit is consistent met het bestaande contextual help systeem.

## Overzicht per pagina

### 1. Widget (`SettingsReserveringenWidget.tsx`)
De `CardHeader` helper-component aanpassen zodat deze een optionele `help` prop accepteert met een FieldHelp-icoon.

| Sectie | Help-tekst |
|--------|-----------|
| Configuratie | Schakel de widget in en stel de basis-URL en gastervaring in. |
| Weergave | Bepaal de visuele stijl en branding-opties die gasten zien. |
| Branding | Pas kleuren en logo aan om de widget bij je huisstijl te laten passen. |
| Boekingsvragen | Stel extra vragen in die gasten beantwoorden bij het boeken. Antwoorden worden als tags opgeslagen. |
| Integratie | Embed de widget op je website via een knop, inline container of directe link. |

### 2. Pacing (`SettingsReserveringenPacing.tsx`)

| Sectie | Help-tekst |
|--------|-----------|
| Standaard Pacing | Maximaal aantal gasten per kwartier. Bepaalt de kleurindicatie in het grid. |
| Shift Overrides | Stel afwijkende pacing in voor specifieke shifts als lunch en diner een ander tempo vereisen. |

### 3. Communicatie (`SettingsCommunicatie.tsx`)

| Sectie | Help-tekst |
|--------|-----------|
| Branding | Logo, kleur en footer die in alle uitgaande emails verschijnen. |
| Afzender | Naam en reply-to adres die ontvangers zien. Het verzenddomein wordt centraal beheerd. |
| Kanalen | Welke communicatiekanalen actief zijn voor berichten naar gasten en kandidaten. |

### 4. Shifts (`SettingsReserveringenShifts.tsx`)

| Sectie | Help-tekst |
|--------|-----------|
| Shift overzicht | Alle actieve en inactieve shifts. Versleep om prioriteit bij overlapping te bepalen. |

### 5. Shift Exceptions (`ShiftExceptionsSection.tsx`)

| Sectie | Help-tekst |
|--------|-----------|
| Uitzonderingen | Eenmalige afwijkingen van het standaard shift-schema, zoals gesloten dagen of aangepaste tijden. |

### 6. Locatie-instellingen sub-kaarten

| Component | Sectie | Help-tekst |
|-----------|--------|-----------|
| `LocationSettingsCard` | Locatie Instellingen | Standaard tafeltijd, buffer en cutoff die gelden als een ticket geen eigen waarde heeft. |
| `CheckinSettingsCard` | Check-in & No-show | Regels voor wanneer gasten mogen inchecken en wanneer een no-show automatisch wordt gemarkeerd. |
| `OptionSettingsCard` | Optie-reserveringen | Sta toe dat reserveringen als optie (voorlopig) worden aangemaakt met een automatische vervaldatum. |

### 7. Tafelcombinaties (`TableGroupsSection.tsx`)

| Sectie | Help-tekst |
|--------|-----------|
| Tafelcombinaties | Combineer tafels zodat het systeem ze automatisch kan samenvoegen voor grotere gezelschappen. |

## Technisch

**Pattern**: Naast elke `<h3>` sectie-header wordt een `<FieldHelp>` component geplaatst:

```tsx
<div className="flex items-center gap-1.5">
  <h3 className="text-base font-semibold">Sectie Titel</h3>
  <FieldHelp>
    <p className="text-muted-foreground">Uitleg over deze sectie...</p>
  </FieldHelp>
</div>
```

**Widget CardHeader**: De lokale `CardHeader` helper krijgt een optionele `helpText` prop zodat alle 5 kaarten consistent FieldHelp krijgen.

**Bestanden die worden aangepast:**
- `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` (5 secties)
- `src/pages/settings/reserveringen/SettingsReserveringenPacing.tsx` (2 secties)
- `src/pages/settings/reserveringen/SettingsReserveringenShifts.tsx` (1 sectie)
- `src/pages/settings/SettingsCommunicatie.tsx` (3 secties)
- `src/components/settings/shifts/exceptions/ShiftExceptionsSection.tsx` (1 sectie)
- `src/components/settings/tables/LocationSettingsCard.tsx` (1 sectie)
- `src/components/settings/checkin/CheckinSettingsCard.tsx` (1 sectie)
- `src/components/settings/options/OptionSettingsCard.tsx` (1 sectie)
- `src/components/settings/tables/TableGroupsSection.tsx` (1 sectie)

**Totaal: 15 info-iconen verdeeld over 9 bestanden.**

Geen database wijzigingen. Geen nieuwe dependencies.
