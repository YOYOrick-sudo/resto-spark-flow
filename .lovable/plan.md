
# Widget settings: enterprise redesign

## Wat is er nu mis

De pagina volgt het enterprise design system op hoofdlijnen (NestoCards, SettingsDetailLayout), maar heeft op 5 punten concrete afwijkingen die zorgen voor de drukte en onoverzichtelijkheid:

### 1. Configuratie card: geen visuele sub-groepering
5 losstaande velden (switch, slug input, textarea, select, redirect URL) staan direct onder elkaar in `space-y-4`. Er is geen onderscheid tussen:
- **Status & identiteit** (widget aan/uit + slug)
- **Gastervaring** (welkomsttekst + niet-beschikbaar tekst)
- **Gedrag na boeking** (redirect URL)

Fix: Enterprise Form Grouping — `bg-secondary/50 rounded-card p-4 space-y-4` per logische groep (Sectie 4 van het design guide).

### 2. sectionDivider te zwak
Huidige waarde: `border-t border-border/50 pt-5 mt-5`
- `border-border/50` is te licht — scheidt secties nauwelijks
- `pt-5 mt-5` = 20px top én bottom — te krap

Fix: `border-t border-border pt-6 mt-6` (conform Sectie 5: "Sectie divider: `border-t my-6`")

### 3. Weergave card: Widget stijl selector staat los
De 3-knops widget stijl selector heeft geen sectielabel (`text-[11px] font-semibold uppercase tracking-wider`). De dividers tussen de switches zijn `divide-border/50` wat te subtiel is.

Fix: Voeg sectielabel toe boven de stijl selector. Vergroot switch-rij padding van `py-4` naar `py-5`.

### 4. BookingQuestionsEditor: raw `<Input>` en `<Label>`
In het formulier voor nieuwe vragen worden raw ShadCN `<Input>` en `<Label>` gebruikt — dat is **expliciet verboden** in het design system. Dit zorgt voor een visueel andere stijl dan de rest van de pagina.

Fix: Vervang `<Input>` door `<NestoInput>` en `<Label>` door inline `<label className="text-label text-muted-foreground">`.

### 5. Integratie card: knopconfiguratie zonder groepering
De button mode-config (knoptekst, positie, pulse-switch) staat in `space-y-4` zonder `bg-secondary/50` wrapping — de instellingen zweven los in de sectie.

Fix: Wrap in `bg-secondary/50 rounded-card p-4 space-y-4`.

---

## Wijzigingen per bestand

### `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx`

1. **sectionDivider** → `"border-t border-border pt-6 mt-6"`
2. **Configuratie card** → 2 groeperings-blokken met `bg-secondary/50 rounded-card p-4 space-y-4`:
   - Blok A: widget_enabled switch + locatie slug
   - Blok B: welkomsttekst + unavailable_text select
   - Redirect URL staat los eronder (niet ingegroepeerd, want het is optioneel/advanced)
3. **Weergave card** → voeg `<h4 className={sectionHeader}>` toe boven widget stijl selector. Switch rijen: `py-5` ipv `py-4`.
4. **Integratie card, button mode** → wrap de 3 velden in `bg-secondary/50 rounded-card p-4 space-y-4`

### `src/components/settings/widget/BookingQuestionsEditor.tsx`

5. **raw `<Input>`** → `<NestoInput>` (2x: vraag label + optie input)
6. **raw `<Label>`** → `<label className="mb-1.5 block text-label text-muted-foreground">`
7. Import `Input` en `Label` van ShadCN verwijderen, `NestoInput` importeren

---

## Technisch overzicht

Alleen CSS-klasse en component-import wijzigingen. Geen logica, geen database, geen nieuwe componenten.

```text
src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx
  - sectionDivider versterkt
  - Configuratie: 2 groeperings-blokken toegevoegd
  - Weergave: sectionHeader boven stijl selector
  - Integratie: button-config gewrapped

src/components/settings/widget/BookingQuestionsEditor.tsx
  - <Input> → <NestoInput>
  - <Label> → <label> met enterprise styling
  - Imports bijgewerkt
```
