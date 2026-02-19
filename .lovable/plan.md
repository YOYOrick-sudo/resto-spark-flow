
# Fix: Widget Kleurenpalet Bugs

## Gevonden problemen

### Bug 1: Race condition bij palette selectie (HOOFDPROBLEEM)
Wanneer je een curated palette (bijv. "Ocean Blue") selecteert, worden `onPrimaryChange` en `onAccentChange` na elkaar aangeroepen. Beide roepen `updateField` aan, die `debouncedSave` triggert. De debounce annuleert de eerste call (primary), waardoor alleen de accent kleur wordt opgeslagen. Na een refetch springt de primary terug naar de oude waarde.

**Bewijs**: Na klik op "Ocean Blue" werd alleen `{"widget_accent_color":"#6366F1"}` naar de server gestuurd. De primary `#0EA5E9` ging verloren.

### Bug 2: Hex input vuurt bij elke toetsaanslag
Elke letter in het hex-invoerveld triggert direct een `updateField` + `debouncedSave`. Dit kan ongeldige waarden opslaan (bijv. `#1`, `#10B`).

### Bug 3: TypeScript `as any` casts
`widget_accent_color` en `widget_button_style` worden met `(settings as any)` benaderd in plaats van via de correcte types.

## Oplossing

### Fix 1: Gecombineerde save voor palette selectie

In `SettingsReserveringenWidget.tsx` een nieuwe `updateFields` functie toevoegen die meerdere velden tegelijk opslaart:

```typescript
const updateFields = (updates: Partial<LocalSettings>) => {
  setLocal(prev => ({ ...prev, ...updates }));
  debouncedSave(updates);
};
```

En de `ColorPaletteSelector` een `onPaletteChange` callback geven die beide kleuren tegelijk doorstuurt:

```typescript
<ColorPaletteSelector
  primaryColor={local.widget_primary_color}
  accentColor={local.widget_accent_color}
  onPrimaryChange={color => updateField('widget_primary_color', color)}
  onAccentChange={color => updateField('widget_accent_color', color)}
  onPaletteChange={(primary, accent) => 
    updateFields({ widget_primary_color: primary, widget_accent_color: accent })
  }
/>
```

In `ColorPaletteSelector.tsx` de `applyPalette` functie aanpassen om `onPaletteChange` te gebruiken (als beschikbaar) in plaats van twee losse calls.

### Fix 2: Hex input alleen opslaan bij geldige waarde

In de `SwatchGrid` component de `onChange` van het hex-invoerveld aanpassen: lokaal de waarde bijwerken maar alleen `onChange` (de ouder) aanroepen wanneer het een geldig hex-formaat is.

### Fix 3: Type casts verwijderen

De `as any` casts op regels 93 en 97 vervangen door directe property access nu `widget_accent_color` en `widget_button_style` in het database schema zitten.

## Technische details

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` | `updateFields` functie + `onPaletteChange` prop + `as any` casts verwijderen |
| `src/components/settings/widget/ColorPaletteSelector.tsx` | `onPaletteChange` prop toevoegen, hex input validatie, `applyPalette` aanpassen |

### Geen database wijzigingen nodig
De kolommen bestaan al correct in de database.
