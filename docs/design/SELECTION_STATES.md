# Selection States — Design Patronen

Dit document beschrijft de twee correcte selectie-patronen in Nesto. Kies het juiste patroon op basis van het type component.

---

## Patroon 1: Toggle Buttons (inline)

**Gebruik voor:** inline knoppen, periode selectors, view toggles, filter chips.

| Staat | Klassen |
|---|---|
| Selected | `bg-primary/10 text-primary border border-primary/20 shadow-sm` |
| Unselected | `bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground` |

**Kenmerken:**
- Subtiele, lichte border (`border-primary/20`)
- Lichte schaduw (`shadow-sm`)
- Geen `border-[1.5px]`, geen opaque `border-primary`

**Componenten die dit gebruiken:**
- `ViewToggle` — grid/list/calendar selector
- `DensityToggle` — compact/comfortable selector
- `NestoOutlineButtonGroup` — periode selectors, template categorieën
- `AssistantFilters` — module filter knoppen

---

## Patroon 2: Settings Navigation (sidebar menu items)

**Gebruik voor:** navigatie-items in settings sidebars, categorie menu's.

| Staat | Klassen |
|---|---|
| Selected | `bg-selected-bg border-selected-border text-primary font-semibold border-[1.5px]` |
| Unselected | `bg-transparent border-transparent text-muted-foreground hover:bg-accent/60 border-[1.5px]` |

**Kenmerken:**
- Semantische tokens (`selected-bg`, `selected-border`)
- Dikkere border (`border-[1.5px]`) voor navigatie-gewicht
- `font-semibold` op actieve staat

**Componenten die dit gebruiken:**
- `SettingsPageLayout` — categorieën sidebar
- `CategorySidebar` — categorie navigatie in detail pagina's

---

## Beslisregel

| Vraag | Antwoord | Patroon |
|---|---|---|
| Is het een inline toggle/filter? | Ja | Patroon 1 |
| Is het een sidebar navigatie-item? | Ja | Patroon 2 |
| Staat het in een toolbar of header? | Ja | Patroon 1 |
| Navigeert het naar een andere sectie/pagina? | Ja | Patroon 2 |

---

## Anti-patronen (NIET gebruiken)

- ❌ `border-[1.5px] border-primary` op inline toggles — te zwaar
- ❌ `border border-primary/20` op settings navigatie — te subtiel
- ❌ `border-primary` (opaque) op toggle buttons — dubbele rand effect
