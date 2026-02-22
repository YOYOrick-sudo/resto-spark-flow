
# Preview automatisch meeschakelen met weergavemodus

## Wat verandert

Wanneer de gebruiker in de "Weergave" kaart kiest voor **Popup** of **Sticky bar**, schakelt de preview rechts automatisch mee naar het juiste type. Geen handmatige actie meer nodig.

## Technische wijziging

### `src/pages/marketing/PopupPage.tsx`

In de twee mode-selector `onClick` handlers (regels 463-465 en 487-489):

- **Popup-knop**: voeg `setPreviewType('popup')` toe
- **Sticky bar-knop**: voeg `setPreviewType('bar')` toe

Dat is alles — twee regels toevoegen. De `previewType` state en `setPreviewType` setter zijn al beschikbaar in de `PopupEditor` component als props.

| Bestand | Wijziging |
|---|---|
| `src/pages/marketing/PopupPage.tsx` | `setPreviewType` aanroepen in beide mode-selector knoppen |
