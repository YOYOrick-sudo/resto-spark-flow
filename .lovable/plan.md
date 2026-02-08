

## Dubbele titel verwijderen in AreasSection

### Probleem
Op de Areas pagina staat de titel "Areas" en beschrijving "Beheer ruimtes en de tafels daarin." twee keer: in de page header (via `SettingsDetailLayout`) en in de `NestoCard` header binnen `AreasSection`.

### Oplossing

**Bestand: `src/components/settings/tables/AreasSection.tsx`**

De `<div>` met de `<h3>` en `<p>` tags (regels ~161-167) wordt verwijderd. De `flex items-center justify-between mb-6` wrapper blijft bestaan maar bevat alleen de "Nieuwe Area" button, rechts uitgelijnd via `ml-auto` of `justify-end`.

Van:
```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h3 className="text-lg font-medium">Areas</h3>
    <p className="text-sm text-muted-foreground">
      Beheer ruimtes en de tafels daarin.
    </p>
  </div>
  <NestoButton onClick={handleAddArea} size="sm" disabled={!locationId}>
    <Plus className="h-4 w-4 mr-1" />
    Nieuwe Area
  </NestoButton>
</div>
```

Naar:
```tsx
<div className="flex justify-end mb-6">
  <NestoButton onClick={handleAddArea} size="sm" disabled={!locationId}>
    <Plus className="h-4 w-4 mr-1" />
    Nieuwe Area
  </NestoButton>
</div>
```

Geen andere bestanden worden aangepast.

