# Settings Navigatie: Patroonkeuze

Laatst bijgewerkt: 12 februari 2025

## Twee patronen, één platform

Enterprise platforms (Stripe, Linear, HubSpot) gebruiken meerdere navigatiepatronen — maar met duidelijke regels. Nesto doet hetzelfde.

---

## Patroon A — Multi-Level Hub

Routes splitsen uit naar aparte pagina's via navigatiekaarten. Breadcrumbs als enige navigatie. Tot 4 niveaus diep.

**Gebruik wanneer:**
- De module 4+ secties heeft die elk een eigen entiteitslijst of complexe configuratie bevatten
- Secties onderling weinig verband hebben (je werkt op 1 sectie tegelijk)
- Er subsecties zijn die verdere nesting rechtvaardigen

**Voorbeeld:** Reserveringen (Pacing, Tafels, Shifts, Tickets, Notificaties — elk een eigen wereld)

---

## Patroon B — Tabbed Single Page

Alles op één pagina met horizontale tabs. Geen extra routes.

**Gebruik wanneer:**
- De module 2-4 secties heeft die samen een workflow vormen
- Een gebruiker waarschijnlijk meerdere tabs in dezelfde sessie bezoekt
- Secties zijn lichtgewicht (geen diepe entity-lijsten, vooral formulieren en configuratie)

**Voorbeeld:** Onboarding (Fasen, Team, Templates, Reminders — samen vormen ze de pipeline setup)

---

## Beslisregel

```
Heeft de module secties die elk een eigen entiteitslijst
met CRUD-operaties bevatten?
  JA  → Multi-Level Hub
  NEE → Tabbed Single Page
```

---

## Module-indeling

| Module | Patroon | Reden |
|--------|---------|-------|
| **Reserveringen** | Multi-Level Hub | Pacing, tafels, shifts, tickets, notificaties — elk eigen CRUD |
| **Keuken** | Multi-Level Hub | Recepten, halffabricaten, ingrediënten, allergenen — elk eigen CRUD |
| **Kaartbeheer** | Multi-Level Hub | Menu's, categorieën, seizoenen, pricing — complexe entiteiten |
| **Finance** | Multi-Level Hub | BTW, facturatie, koppelingen, rapportage — onafhankelijke secties |
| **HRM / Onboarding** | Tabbed Single Page | Pipeline config, team, templates — samenhangende workflow |
| **Communicatie** | Tabbed Single Page | Kanalen, templates, voorkeuren — lichtgewicht, gerelateerd |
| **Voorkeuren** | Tabbed Single Page | Algemeen, taal, notificaties — simpele toggles en dropdowns |

---

## Consistentieregels (beide patronen)

Ongeacht het patroon, delen alle settings pagina's:

1. **SettingsDetailLayout** als wrapper (breadcrumbs, titel, beschrijving, actions)
2. **Zelfde breadcrumb-structuur** — Settings > Module > [Sectie]
3. **Zelfde card-styling** (NestoCard, geen card-in-card)
4. **Zelfde formulierpatronen** (switches, inputs, dividers per SETTINGS_PAGE_PATTERNS.md)
5. **Zelfde SettingsContainer** (max-w-5xl)

Het verschil zit puur in de navigatie-laag: kaarten die naar routes linken vs. tabs die content switchen. Alles daaronder is identiek.

---

## Gerelateerde documenten

- `docs/design/SETTINGS_MULTI_LEVEL_NAVIGATION.md` — Multi-Level Hub specificaties
- `docs/design/SETTINGS_PAGE_PATTERNS.md` — Formulier en card patterns
- `docs/design/SETTINGS_LIST_PATTERNS.md` — Lijst patronen (Flat Table, Collapsible Card, Compound)
