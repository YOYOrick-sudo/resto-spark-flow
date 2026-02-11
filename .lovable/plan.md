
# Enterprise Design Polish - Onboarding Settings

Alle 6 onboarding settings componenten worden bijgewerkt naar de volledige Nesto Polar enterprise standaard, inclusief de nieuwe typografie/contrast regels en de 6 extra patronen (tabular-nums, truncation+tooltips, transition tokens, grouped suffixes, focus-visible, compact density).

---

## Bestanden die worden aangepast

### 1. `src/components/onboarding/settings/PhaseConfigCard.tsx`

**Huidige issues:**
- Phase nummer gebruikt `font-medium` in plaats van `font-semibold`
- Expand button mist expliciete `duration-150` transition token
- Truncated title mist tooltip fallback

**Wijzigingen:**
- Phase nummer: `text-sm font-medium` wordt `text-sm font-semibold` (primaire data)
- Truncated phase name: wrap in `Tooltip` zodat lange namen leesbaar blijven
- Expand/collapse button: voeg `duration-150` toe als expliciete transition token
- Taken count: voeg `tabular-nums` toe voor consistent numeriek alignment

---

### 2. `src/components/onboarding/settings/TaskTemplateList.tsx`

**Huidige issues:**
- Task rows gebruiken `bg-muted/30` (verboden achtergrondwisseling)
- Delete button mist `focus-visible` ring
- Geen `divide-y` separator patroon

**Wijzigingen:**
- Task row achtergrond: `bg-muted/30` wordt verwijderd, vervangen door `divide-y divide-border/50` op container + `hover:bg-accent/40 duration-150` per rij
- Task row padding: `p-3` wordt `py-2.5 px-3` (compacter, Linear-style)
- Delete button: voeg `focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-1` toe
- "Geautomatiseerd" label: blijft `text-xs text-muted-foreground` (correct, tertiair)

---

### 3. `src/components/onboarding/settings/ReminderSettingsSection.tsx`

**Huidige issues:**
- Gebruikt raw `Input` in plaats van grouped input+suffix patroon
- "uur" / "dagen" suffix zweeft los als tekst
- Nummervelden missen `tabular-nums`

**Wijzigingen:**
- Nummer inputs: voeg `tabular-nums` class toe
- Grouped input suffix: wrap input + eenheid ("uur"/"dagen") in een visuele groep met `flex` container, input met `rounded-r-none border-r-0`, suffix badge met `bg-secondary border border-border rounded-r-button px-3 text-xs text-muted-foreground`
- "Opgeslagen" indicator: voeg `duration-200` transition toe voor smooth fade
- Section header: al correct (`font-semibold`), geen wijziging nodig

---

### 4. `src/components/onboarding/settings/EmailTemplateEditor.tsx`

**Huidige issues:**
- Preview labels gebruiken `font-medium` in plaats van `font-semibold` (enterprise standaard voor micro-labels)
- Variable chips missen `focus-visible` ring voor keyboard navigatie
- Preview toggle button mist expliciete transition timing

**Wijzigingen:**
- Preview sectie labels: `font-medium` wordt `font-semibold` (matcht enterprise micro-label standaard)
- Variable chip buttons: voeg `focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-1` toe
- Preview toggle: voeg `duration-150` toe als expliciete transition token
- Preview body rendered text: voeg `tabular-nums` toe (voor datums in preview)

---

### 5. `src/components/onboarding/settings/EmailConfigSection.tsx`

**Huidige issues:**
- Labels gebruiken `text-sm mb-1.5` maar missen de enterprise micro-label styling optie
- Hulptekst is correct (`text-xs text-muted-foreground`)
- Geen focus-visible op inputs (erft van base component, maar extra check)

**Wijzigingen:**
- Card header: al correct (`font-semibold`), geen wijziging nodig
- Form velden groeperen in `bg-secondary/50 rounded-card p-4 space-y-4` block (enterprise form grouping patroon, consistent met EmailTemplateEditor)
- "Opgeslagen" indicator: voeg `duration-200` transition toe

---

### 6. `src/components/onboarding/settings/PhaseConfigSection.tsx`

**Wijzigingen:**
- Container `space-y-3` wordt `space-y-3 divide-y-0` (expliciet geen dubbele separatie met card shadows)
- Geen andere wijzigingen nodig, delegeert aan PhaseConfigCard

---

## Samenvatting enterprise patronen toegepast

| Patroon | Waar toegepast |
|---|---|
| `tabular-nums` | ReminderSettings nummer inputs, EmailTemplate preview datums, PhaseConfigCard taken count |
| Truncation + Tooltip | PhaseConfigCard phase namen |
| Transition tokens (`duration-150`, `duration-200`) | Alle hover states, expand/collapse, opgeslagen indicators |
| Grouped input suffix | ReminderSettings "uur"/"dagen" velden |
| `focus-visible:ring-1 focus-visible:ring-primary/30` | Variable chips, delete buttons, expand triggers |
| Compact density (`divide-y` i.p.v. `bg-muted`) | TaskTemplateList rijen |
| Enterprise typography (`font-semibold`, geen `font-medium` op data) | PhaseConfigCard nummer, EmailTemplate preview labels |
| Enterprise form grouping (`bg-secondary/50 rounded-card p-4`) | EmailConfigSection velden |
