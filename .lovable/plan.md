

# Weergave-modus: duidelijke keuze tussen Popup en Sticky Bar

## Wat verandert er voor de gebruiker

De huidige "Weergave" kaart toont drie losse switches (exit-intent, timed popup, sticky bar) alsof ze onafhankelijk zijn. Dit is verwarrend: een gebruiker snapt niet dat sticky bar en popup niet samen horen te werken.

De oplossing: vervang de losse switches door een duidelijke **weergave-modus selector** bovenaan, gevolgd door modus-specifieke opties.

## Nieuw ontwerp

```text
+-----------------------------------------------+
| Weergave                                       |
|                                                |
| Hoe wil je de popup tonen?                     |
|                                                |
| +-------------------+  +-------------------+   |
| | [icon] Popup      |  | [icon] Sticky bar |   |
| | Overlay die ver-  |  | Vaste balk boven  |   |
| | schijnt bij een   |  | of onder de       |   |
| | trigger           |  | pagina            |   |
| +-------------------+  +-------------------+   |
|                                                |
| --- Trigger (alleen bij modus "Popup") ---     |
|                                                |
| Exit-intent          [switch]                  |
| Timed popup          [switch]                  |
|   -> delay slider                              |
|                                                |
| --- Positie (alleen bij modus "Sticky bar") -- |
|                                                |
| Positie: [Bovenkant / Onderkant]               |
|                                                |
| --- Planning (altijd zichtbaar) ---            |
| Planning             [switch]                  |
+-----------------------------------------------+
```

## Technische wijzigingen

### 1. `src/pages/marketing/PopupPage.tsx`

**State**: voeg een afgeleide variabele `displayMode` toe:
- `displayMode = state.sticky_bar_enabled ? 'sticky_bar' : 'popup'`

**Modus-selector**: vervang de drie losse switch-rijen door een `grid grid-cols-2 gap-2` met twee klikbare kaarten (zelfde patroon als widget_style selector in SettingsReserveringenWidget). Actieve kaart krijgt `border-primary bg-primary/5`.

**Bij moduswissel**:
- Kies "Popup": zet `sticky_bar_enabled = false` (exit-intent/timed blijven)
- Kies "Sticky bar": zet `sticky_bar_enabled = true`, `exit_intent_enabled = false`, `timed_popup_enabled = false`

**Conditionele secties**:
- Modus "Popup": toon exit-intent en timed popup switches (bestaande UI)
- Modus "Sticky bar": toon positie-selector (bestaande UI)
- Planning blijft altijd zichtbaar, ongeacht de modus

### 2. `supabase/functions/marketing-popup-widget/index.ts`

Bestaande logica aanpassen: als `sticky_bar_enabled === true`, registreer geen popup-triggers (exit-intent, timed, fallback). Alleen de sticky bar wordt gerenderd.

### 3. `src/pages/PopupPreviewDemo.tsx`

Preview-logica aanpassen: als `sticky_bar_enabled === true`, render alleen de sticky bar HTML en sla de overlay popup over.

## Samenvatting bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/marketing/PopupPage.tsx` | Modus-selector UI, conditionele secties, state-logica bij wissel |
| `supabase/functions/marketing-popup-widget/index.ts` | Popup triggers overslaan als sticky bar actief |
| `src/pages/PopupPreviewDemo.tsx` | Overlay overslaan als sticky bar actief |

