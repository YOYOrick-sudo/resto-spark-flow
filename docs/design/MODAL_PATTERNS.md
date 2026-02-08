# Modal Patterns — Nesto Polar UI

## Standaard voor alle create/edit modals

### Labels
- **Sentence case** — nooit uppercase
- Font: `text-[13px] font-medium text-muted-foreground` (via NestoInput of FormField)
- Voorbeeld: "Tafelnummer", "Min. capaciteit" — NIET "TAFELNUMMER"

### Groepering & Secties
- Gerelateerde velden groeperen in visuele secties
- Secties gescheiden door: `border-t border-border/50 pt-4 mt-4`
- Sectie labels: `text-sm font-medium text-foreground mb-3`
- Eerste sectie heeft geen divider (begint direct na modal title)

### Buttons (Footer)
- Rechts uitgelijnd: `flex justify-end gap-3 pt-4`
- "Annuleren" (outline variant) links, primaire actie rechts
- Disabled state tijdens pending: `disabled={isPending}`
- Loading tekst: "Opslaan..." (niet "Laden..." of spinner)

### Modal Size
- Default: `size="md"` (max-w-lg, ~480px)
- Gebruik `size="lg"` alleen voor modals met veel content (wizards, previews)

### Verboden
- ❌ "Coming soon" placeholders in modals
- ❌ Uppercase labels
- ❌ Gecentreerde buttons (altijd rechts uitgelijnd)
- ❌ Features tonen die nog niet werken

### Voorbeeld structuur
```tsx
<NestoModal open={open} onOpenChange={onOpenChange} title="Nieuw item" size="md">
  <form onSubmit={handleSubmit} className="space-y-4">
    {/* Sectie 1: geen divider */}
    <div className="grid grid-cols-2 gap-4">
      <NestoInput label="Veld A" ... />
      <NestoInput label="Veld B" ... />
    </div>

    {/* Sectie 2: met divider */}
    <div className="border-t border-border/50 pt-4 mt-4">
      <p className="text-sm font-medium text-foreground mb-3">Sectie titel</p>
      <div className="grid grid-cols-2 gap-4">
        <NestoInput label="Veld C" ... />
        <NestoInput label="Veld D" ... />
      </div>
    </div>

    {/* Footer */}
    <div className="flex justify-end gap-3 pt-4">
      <NestoButton variant="outline" onClick={() => onOpenChange(false)}>
        Annuleren
      </NestoButton>
      <NestoButton type="submit" disabled={isPending}>
        {isPending ? 'Opslaan...' : 'Aanmaken'}
      </NestoButton>
    </div>
  </form>
</NestoModal>
```
