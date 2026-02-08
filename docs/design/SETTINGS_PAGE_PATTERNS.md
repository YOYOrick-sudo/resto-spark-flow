# Settings Page Patterns

Dit document beschrijft de standaard UX/UI patronen voor alle settings pagina's in Nesto.

## Layout Structuur

Settings pagina's gebruiken `SettingsPageLayout` met:
- **Breadcrumb**: Navigatie terug naar parent
- **Categorieën Sidebar**: Verticale sub-navigatie (sticky, `bg-secondary`)
- **Content Area**: Hoofdinhoud rechts van sidebar

```tsx
<SettingsPageLayout
  title="Pagina Titel"
  breadcrumbItems={[
    { label: "Instellingen", href: "/instellingen" },
    { label: "Huidige Pagina" }
  ]}
  sections={sections}
  activeSection={activeSection}
  onSectionChange={setActiveSection}
>
  {/* Content per sectie */}
</SettingsPageLayout>
```

## Belangrijke Regels

1. **Geen titelduplicatie**: Page-level titels worden NIET herhaald in NestoCard headers. De page header (via `SettingsDetailLayout`) geeft titel + beschrijving. Cards beginnen direct met content of action buttons.

2. **Primaire actie in page header**: Primaire actie buttons (`+ Nieuw item`) horen in de page header (rechts uitgelijnd via `SettingsDetailLayout` actions), NIET in een card header.

3. **Geen card-in-card nesting**: Vermijd card-in-card nesting. Gebruik één NestoCard per logische content-groep. Zie `docs/design/CARD_SHADOWS.md` voor details.

---

## Sectie Kaarten

Elke logische sectie wordt gewrapt in een `NestoCard`:

```tsx
<NestoCard className="p-6">
  {/* Content begint direct — geen titel herhaling */}
  <div className="space-y-3">
    {/* Items */}
  </div>
</NestoCard>
```

### Sectie Header Specificaties (alleen als er geen page header is)
- **Titel**: `text-lg font-medium`
- **Beschrijving**: `text-sm text-muted-foreground`
- **Primaire actie**: Hoort in page header, niet in card
- **Spacing**: `mb-6` tussen header en content

## Meerdere Secties in Één Kaart

Wanneer secties logisch gerelateerd zijn, combineer ze in één kaart met dividers:

```tsx
<NestoCard className="p-6">
  {/* Sectie 1 */}
  <div>
    <h3 className="text-lg font-medium mb-4">Eerste Sectie</h3>
    {/* Content */}
  </div>

  {/* Divider */}
  <div className="border-t my-6" />

  {/* Sectie 2 */}
  <div>
    <h3 className="text-lg font-medium mb-4">Tweede Sectie</h3>
    {/* Content */}
  </div>
</NestoCard>
```

### Divider Specificaties
- **Stijl**: `border-t` (1px top border)
- **Spacing**: `my-6` (24px boven en onder)

## Formulier Velden

### Toggle Settings (Switch)
```tsx
<div className="flex items-center justify-between py-3">
  <div>
    <p className="text-sm font-medium">Setting Label</p>
    <p className="text-xs text-muted-foreground">Uitleg van de setting.</p>
  </div>
  <Switch checked={value} onCheckedChange={onChange} />
</div>
```

### Numerieke Inputs
```tsx
<div className="flex items-center justify-between py-3">
  <div>
    <p className="text-sm font-medium">Setting Label</p>
    <p className="text-xs text-muted-foreground">Uitleg van de setting.</p>
  </div>
  <NestoInput
    type="number"
    value={value}
    onChange={onChange}
    className="w-20 text-right"
    suffix="min"
  />
</div>
```

### Input Grid (Gerelateerde Velden)
```tsx
<div className="grid grid-cols-2 gap-4">
  <NestoInput label="Veld 1" value={value1} onChange={onChange1} />
  <NestoInput label="Veld 2" value={value2} onChange={onChange2} />
</div>
```

## Empty States

Binnen een kaart, gebruik een simpele centered tekst:

```tsx
<div className="text-center py-6 text-muted-foreground">
  <p>Nog geen items aangemaakt.</p>
  <NestoButton variant="outline" size="sm" className="mt-2" onClick={onAdd}>
    <Plus className="h-4 w-4 mr-1" />
    Eerste item toevoegen
  </NestoButton>
</div>
```

Voor standalone empty states (zonder kaart wrapper):

```tsx
<div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
  <p>Nog geen items aangemaakt.</p>
  <NestoButton variant="outline" size="sm" className="mt-2" onClick={onAdd}>
    <Plus className="h-4 w-4 mr-1" />
    Eerste item toevoegen
  </NestoButton>
</div>
```

## Gearchiveerde Items

Gebruik een `Collapsible` onder de cards voor gearchiveerde content. De collapsible staat buiten de cards, met een subtiele achtergrond:

```tsx
{hasArchivedItems && (
  <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen} className="mt-6 bg-muted/30 rounded-lg p-4">
    <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
      <ChevronRight className={`h-4 w-4 transition-transform ${archivedOpen ? 'rotate-90' : ''}`} />
      <Archive className="h-4 w-4" />
      Gearchiveerd ({archivedItems.length})
    </CollapsibleTrigger>
    <CollapsibleContent className="mt-3 space-y-2">
      {archivedItems.map(item => (
        <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <span className="text-sm font-medium">{item.name}</span>
            <span className="text-xs text-muted-foreground ml-2">
              (extra info)
            </span>
          </div>
          <NestoButton size="sm" variant="ghost" onClick={() => onRestore(item)}>
            Herstellen
          </NestoButton>
        </div>
      ))}
    </CollapsibleContent>
  </Collapsible>
)}
```

### Archived Trigger Specificaties
- **Tekst**: `text-sm text-muted-foreground`
- **Hover**: `hover:text-foreground transition-colors`
- **Iconen**: `ChevronRight` (roteert 90° open) + `Archive`
- **Wrapper**: `mt-6 bg-muted/30 rounded-lg p-4` (buiten de cards, eigen visueel blok)
- **Spacing**: `mt-3` voor content binnen de collapsible

### Archived Item Specificaties
- **Container**: `p-3 bg-muted/50 rounded-lg`
- **Layout**: `flex items-center justify-between`
- **Actie**: `NestoButton size="sm" variant="ghost"`

## Save Status Indicator

Voor auto-save functionaliteit, toon status rechts van de kaart titel:

```tsx
<div className="flex items-center justify-between mb-6">
  <h3 className="text-lg font-medium">Sectie Titel</h3>
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    {isPending && (
      <>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Opslaan...</span>
      </>
    )}
    {showSaved && !isPending && (
      <>
        <Check className="h-3 w-3 text-green-600" />
        <span className="text-green-600">Opgeslagen</span>
      </>
    )}
  </div>
</div>
```

## Spacing Overzicht

| Element | Spacing |
|---------|---------|
| Kaart padding | `p-6` (24px) |
| Header naar content | `mb-6` (24px) |
| Sectie divider | `my-6` (24px boven/onder) |
| Items in lijst | `space-y-3` (12px) |
| Archived trigger | `mt-4` (16px) |
| Archived content | `mt-3` (12px) |
| Form field rows | `py-3` (12px boven/onder) |

## Checklist Nieuwe Settings Pagina

- [ ] Gebruik `SettingsPageLayout` als wrapper
- [ ] Definieer `sections` array met `id`, `label`, `icon`
- [ ] Wrap elke sectie in `NestoCard className="p-6"`
- [ ] Voeg sectie header toe met titel, beschrijving, actie
- [ ] Gebruik `border-t my-6` dividers tussen gerelateerde secties
- [ ] Implementeer empty state voor lege lijsten
- [ ] Voeg `Collapsible` archived sectie toe indien relevant
- [ ] Implementeer auto-save met status indicator waar nodig
