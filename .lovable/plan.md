

## "+ Nieuwe Area" button verplaatsen naar page header

### Wat verandert er

De "+ Nieuwe Area" button wordt verplaatst van binnen de NestoCard naar de page-level header via de `actions` prop van `SettingsDetailLayout`.

### Aanpassingen

**1. `src/pages/settings/reserveringen/SettingsReserveringenTafelsAreas.tsx`**

- Importeer `Plus` uit lucide-react en `NestoButton` uit polar
- Voeg een `handleAddArea` state/callback toe (of gebruik een ref/state die doorgegeven wordt aan AreasSection)
- Geef de button door via de `actions` prop van `SettingsDetailLayout`:

```tsx
<SettingsDetailLayout
  title="Areas"
  description="Beheer ruimtes en de tafels daarin."
  breadcrumbs={breadcrumbs}
  actions={
    <NestoButton onClick={handleAddArea} size="sm" disabled={!currentLocation?.id}>
      <Plus className="h-4 w-4 mr-1" />
      Nieuwe Area
    </NestoButton>
  }
  aside={...}
>
```

- Om de modal in AreasSection te openen vanuit de parent, wordt een `externalAddTrigger` pattern gebruikt: een state counter in de parent die als prop naar AreasSection gaat. Elke keer dat de button geklikt wordt, wordt de counter verhoogd, en AreasSection reageert met een useEffect.

**2. `src/components/settings/tables/AreasSection.tsx`**

- Nieuwe prop: `externalAddTrigger?: number`
- useEffect die luistert naar changes in `externalAddTrigger` en de area modal opent
- Verwijder de `<div className="flex justify-end mb-4">` wrapper met de button erin

### Technisch detail

Parent (page):
```tsx
const [addTrigger, setAddTrigger] = useState(0);
const handleAddArea = () => setAddTrigger(t => t + 1);
```

AreasSection:
```tsx
interface AreasSectionProps {
  locationId: string | undefined;
  externalAddTrigger?: number;
}

// Inside component:
useEffect(() => {
  if (externalAddTrigger && externalAddTrigger > 0) {
    setEditingArea(null);
    setAreaModalOpen(true);
  }
}, [externalAddTrigger]);
```

Dit houdt de modal-logica binnen AreasSection (waar de AreaModal al leeft) terwijl de trigger vanuit de page header komt.
