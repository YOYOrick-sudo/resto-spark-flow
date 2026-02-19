

# Fix: Widget logo en restaurantnaam doorvoeren naar preview

## Probleem

Het geuploadde logo verschijnt niet in de widget preview omdat de data niet doorgestuurd wordt door de keten van componenten. Er zijn drie breaks in de keten:

1. **SettingsReserveringenWidget.tsx** stuurt `restaurantName=""` (leeg) mee naar EmbedCodePreview, en geeft geen logo/naam door aan WidgetLivePreview
2. **WidgetLivePreview** bouwt een preview URL zonder `logo` en `name` parameters
3. **WidgetPreviewDemo** leest geen `logo`/`name` uit de URL en zet ze niet als `data-logo`/`data-name` op het widget script

## Oplossing

De hele keten repareren zodat logo URL en restaurantnaam correct doorstromen:

### 1. SettingsReserveringenWidget.tsx
- Haal de restaurantnaam op uit de `UserContext` (location.name)
- Geef `logoUrl` en `restaurantName` door aan zowel `EmbedCodePreview` als `WidgetLivePreview`

### 2. WidgetLivePreview
- Accepteer nieuwe props: `logoUrl` en `restaurantName`
- Voeg `logo` en `name` toe aan de preview URL parameters

### 3. WidgetPreviewDemo
- Lees `logo` en `name` uit de URL search params
- Zet ze als `data-logo` en `data-name` attributen op het dynamisch geinjecteerde script element

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` | Restaurant naam uit context halen, doorsturen naar beide preview componenten |
| `src/components/settings/widget/WidgetLivePreview.tsx` | Props toevoegen, URL params uitbreiden |
| `src/pages/WidgetPreviewDemo.tsx` | URL params lezen, data-attributen zetten op script |

Geen database wijzigingen nodig.
