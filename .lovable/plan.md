

## Fix Reserveringen Chart — Label Afsnijding & Edge-to-Edge

### Probleem 1: Laatste dag-label "Z" wordt afgesneden

De `renderDayTick` functie gebruikt `textAnchor="middle"` voor alle labels, maar het laatste datapunt zit tegen de rechterrand waardoor de tekst buiten de SVG valt. 

**Oplossing**: In `renderDayTick`, als het de laatste index is (`index === mockData.length - 1`), gebruik `textAnchor="end"` in plaats van `"middle"`.

### Probleem 2: Chart edges — volle breedte

De card gebruikt al `!p-0` en de content sections hebben eigen padding (`px-6 pt-6` en `px-6 mt-1`). De chart wrapper div (`mt-4`) heeft echter geen negatieve margins en ook geen expliciete breedte-compensatie.

**Oplossing**: De chart wrapper div krijgt geen extra margins nodig omdat de card al `p-0` is. Maar we moeten controleren dat er geen onzichtbare padding zit. De `AreaChart` margin is al `{ top: 0, right: 0, bottom: 0, left: 0 }`. De `NestoCard` heeft al `overflow-hidden`. De chart wrapper `mt-4` wordt vervangen door `mt-4` zonder extra padding — dit is al correct.

Het echte probleem is dat `XAxis` met `height={28}` ruimte inneemt onderaan, maar de chart area zelf stopt daarboven. Om de gradient tot de onderkant van de card te laten lopen, moeten we de XAxis **over** de chart heen laten zweven. Dit doen we door de XAxis `height` te verkleinen en de labels als overlay te positioneren.

**Aanpak**: Geef de `AreaChart` een kleine `margin.right` van `4` zodat het laatste label niet wordt afgesneden, terwijl de linkerkant `0` blijft voor edge-to-edge.

### Wijzigingen in `src/components/dashboard/ReservationsTile.tsx`

1. **`renderDayTick` functie** — Voeg conditie toe voor het laatste label:
   - `textAnchor="end"` wanneer `index === mockData.length - 1`
   - `textAnchor="start"` wanneer `index` het eerste zichtbare label is (index 7)
   - `textAnchor="middle"` voor alle tussenliggende labels

2. **`AreaChart` margin** — Wijzig naar `{ top: 0, right: 8, bottom: 0, left: 0 }` om ruimte te maken voor het laatste label aan de rechterkant. Links blijft 0 voor edge-to-edge aansluiting.

3. **Bevestig bestaande setup** — De card heeft al `!p-0` en `overflow-hidden`, de content secties hebben eigen padding. Geen verdere wijzigingen nodig aan de card structuur.

### Samenvatting

| Bestand | Actie |
|---|---|
| `src/components/dashboard/ReservationsTile.tsx` | Bewerken: renderDayTick textAnchor fix + AreaChart margin.right |
