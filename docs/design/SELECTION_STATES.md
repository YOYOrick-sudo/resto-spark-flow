# Selection States — Design Patronen

Dit document beschrijft de twee correcte selectie-patronen in Nesto. Kies het juiste patroon op basis van het type component.

---

## Patroon 1: Toggle Buttons (inline)

**Gebruik voor:** inline knoppen, periode selectors, view toggles, filter chips, dag-selectors.

**Referentiepunt:** `ViewToggle.tsx`

| Staat | Klassen |
|---|---|
| Selected | `bg-primary/10 text-primary border border-primary/20 shadow-sm` |
| Unselected | `bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground` |

**Variant — Compacte groep (dag-selectors):**

| Staat | Klassen |
|---|---|
| Selected | `bg-primary/10 text-primary border border-primary/20 shadow-sm` |
| Unselected | `bg-muted text-muted-foreground hover:bg-muted/80` |

Gebruik de compacte variant wanneer toggles in een dichte rij staan (bijv. Ma-Di-Wo-Do-Vr-Za-Zo) waar `bg-transparent` te weinig structuur geeft.

**Variant — Read-only badges:**

| Staat | Klassen |
|---|---|
| Active | `bg-primary/10 text-primary border border-primary/20` |
| Inactive | `bg-muted/50 text-muted-foreground` |

Geen `shadow-sm` omdat het niet klikbaar is.

**Kenmerken:**
- Subtiele, lichte border (`border-primary/20`)
- Lichte schaduw (`shadow-sm`) op interactieve elementen
- Geen `border-[1.5px]`, geen opaque `border-primary`

**Componenten die dit gebruiken:**
- `ViewToggle` — grid/list/calendar selector (referentiepunt)
- `DensityToggle` — compact/comfortable selector
- `NestoOutlineButtonGroup` — periode selectors, template categorieën
- `AssistantFilters` — module filter knoppen
- `StatusFilterPills` — onboarding status filters
- `QuickReservationPanel` — reservering/walk-in toggle
- `ShiftModal` — dag-selector (Ma-Zo) (compacte variant)
- `TimesStep` — dag-selector wizard (compacte variant)
- `ReviewStep` — dag-badges review (read-only variant)
- `BulkExceptionModal` — weekdag-selector (compacte variant)

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

## Verboden patronen (NIET gebruiken)

| Patroon | Waarom fout |
|---|---|
| `bg-primary text-primary-foreground` op toggles | Volledig gevulde achtergrond is te zwaar voor inline toggles. Alleen voor actieknoppen (NestoButton). |
| `bg-primary text-primary-foreground border-[1.5px] border-primary` | Dubbel zwaar: gevulde achtergrond + dikke border. |
| `bg-secondary/50 text-muted-foreground` als unselected | Inconsistent met de standaard `bg-transparent` unselected staat. |
| `border-[1.5px] border-primary` op inline toggles | Te zwaar, dit is voor settings navigatie (Patroon 2). |
| `border border-primary/20` op settings navigatie | Te subtiel voor navigatie-items. |
| `border-primary` (opaque) op toggle buttons | Dubbele rand effect. |

---

## Checklist voor nieuwe componenten

1. Bepaal: is het een toggle/filter of navigatie? → Kies patroon
2. Kopieer exacte klassen uit dit document
3. Gebruik NOOIT `bg-primary text-primary-foreground` voor toggles
4. Test in zowel light als dark mode
