# Multi-Level Settings Navigatie Patroon

Laatst bijgewerkt: 10 januari 2025

## Overzicht

Dit document beschrijft het enterprise navigatie patroon voor settings pagina's. In plaats van lange scrollende pagina's met anchor-links, gebruiken we een hiërarchische route-structuur met 4 niveaus.

## Route Hiërarchie

### Niveau 1: Module Overzicht
**Route:** `/instellingen`
**Doel:** Overzicht van alle beschikbare settings modules (Voorkeuren, Keuken, Reserveringen, etc.)
**Component:** `SettingsIndex`

### Niveau 2: Module Index (Categorieën)
**Route:** `/instellingen/{module}`
**Voorbeeld:** `/instellingen/reserveringen`
**Doel:** Overzicht van alle secties binnen een module als cards
**Component:** `SettingsModuleLayout`

### Niveau 3: Sectie Overzicht (Subsecties)
**Route:** `/instellingen/{module}/{sectie}`
**Voorbeeld:** `/instellingen/reserveringen/tafels`
**Doel:** Overzicht van subsecties met CTA's en aantallen
**Component:** `SettingsSectionLayout`

### Niveau 4: Detail/Lijst Pagina
**Route:** `/instellingen/{module}/{sectie}/{subsectie}` of `.../{id}`
**Voorbeeld:** `/instellingen/reserveringen/tafels/areas` of `.../areas/abc123`
**Doel:** Focus op 1 entity type (lijst) of 1 specifiek item (detail)
**Component:** `SettingsDetailLayout` of custom component

---

## UX Regels per Niveau

### Niveau 1 - `/instellingen`
- Grid van module cards
- Elke card toont: icon, titel, korte beschrijving, pijl →
- Click navigeert naar Niveau 2

### Niveau 2 - `/instellingen/{module}`
- Breadcrumb: `Settings > {Module}`
- Grid van sectie cards
- Elke card toont: icon, titel, beschrijving, pijl →
- Click navigeert naar Niveau 3 of direct naar Niveau 4 (afhankelijk van subsecties)

### Niveau 3 - `/instellingen/{module}/{sectie}`
- Breadcrumb: `Settings > {Module} > {Sectie}`
- Lijst/grid van subsectie cards
- Cards tonen: icon, titel, beschrijving, telling (bijv. "3 areas"), pijl →

### Niveau 4 - Detail/Lijst
- Breadcrumb: volledig pad
- Focus op 1 taak: lijst beheren of item bewerken
- Modals voor create/edit operaties

---

## Navigatie Regels (Enterprise)

Dit volgt enterprise SaaS standaarden (Stripe, Linear, Salesforce).

### Kernprincipes
1. **Breadcrumbs zijn de ENIGE hiërarchische navigatie**
2. Geen losse "Terug"-knoppen - deze zijn verboden
3. Laatste breadcrumb = huidige pagina (niet klikbaar)
4. Alle breadcrumb items behalve de laatste zijn klikbaar
5. Er is exact één navigatiebron bovenaan elke pagina

### Wat NIET is toegestaan
- "← Terug naar ..." knoppen
- Dubbele navigatie-elementen
- Breadcrumbs + back button tegelijk
- Paginatitels die navigatie herhalen

### Breadcrumb Regels
1. Altijd zichtbaar op alle niveaus (behalve Niveau 1)
2. Eerste item: "Settings" → `/instellingen/voorkeuren`
3. Volgende items uit route config
4. Laatste item is current page (niet klikbaar)
5. Truncate met "..." bij diepe nesting (max 4-5 items zichtbaar)

---

## Component Verantwoordelijkheden

### `SettingsModuleLayout`
- Props: `moduleConfig`, `children`
- Rendert: breadcrumb, grid van sectie cards
- Gebruik: Niveau 2 pagina's

### `SettingsSectionLayout`
- Props: `moduleConfig`, `sectionId`, `children`
- Rendert: breadcrumb, sectie header, subsectie cards of children
- Gebruik: Niveau 3 pagina's

### `SettingsDetailLayout`
- Props: `title`, `description`, `breadcrumbs`, `actions`, `children`
- Rendert: breadcrumb, header met acties, content area
- Gebruik: Niveau 4 pagina's (lijsten en details)

### `SettingsCard`
- Props: `title`, `description`, `icon`, `count`, `to`
- Rendert: klikbare card met navigatie
- Gebruik: In grids op Niveau 1, 2, 3

---

## Route Config Structuur

```typescript
interface SettingsSubsection {
  id: string;
  label: string;
  path: string;
  description?: string;
  icon?: LucideIcon;
}

interface SettingsSection {
  id: string;
  label: string;
  path: string;
  description?: string;
  icon?: LucideIcon;
  subsections?: SettingsSubsection[];
}

interface SettingsModuleConfig {
  id: string;
  label: string;
  basePath: string;
  description?: string;
  icon?: LucideIcon;
  sections: SettingsSection[];
}
```

---

## Voorbeeld: Reserveringen Module

```
/instellingen/reserveringen              → Cards: Pacing, Tafels, Shifts, Notificaties
/instellingen/reserveringen/pacing       → Pacing formulier
/instellingen/reserveringen/tafels       → Cards: Locatie, Areas, Tafelcombinaties
/instellingen/reserveringen/tafels/locatie    → Locatie settings formulier
/instellingen/reserveringen/tafels/areas      → Areas lijst
/instellingen/reserveringen/tafels/areas/:id  → Area detail + tafels
/instellingen/reserveringen/tafels/tafelgroepen → Tafelcombinaties lijst
/instellingen/reserveringen/shift-tijden → Shift tijden formulier
/instellingen/reserveringen/notificaties → Notificaties formulier
```

---

## Visuele Specs

### Card Grid
- Niveau 1/2: 2 kolommen op desktop, 1 op mobile
- Niveau 3: 1 kolom (verticale lijst)
- Gap: 16px (gap-4)

### Card Styling
- Padding: 16px (p-4) op Niveau 1/2, 12px (p-3) op Niveau 3
- Border: 1.5px border-border
- Radius: rounded-card (12px)
- Hover: bg-accent/50, cursor-pointer
- Icon: 20px, text-primary
- Pijl: 16px, text-muted-foreground, rechts uitgelijnd

### Spacing
- Page padding: standaard AppLayout padding
- Section gap: 24px (space-y-6)
- Card grid gap: 16px (gap-4)
- Binnen card: 12-16px

---

## Migratie Checklist

Bij het migreren van een bestaande settings pagina:

1. [ ] Maak module config in `settingsRouteConfig.ts`
2. [ ] Creëer index pagina (Niveau 2) met cards
3. [ ] Creëer sectie pagina's (Niveau 3) indien subsecties
4. [ ] Verplaats bestaande content naar detail pagina's (Niveau 4)
5. [ ] Voeg routes toe aan `App.tsx`
6. [ ] Update sidebar navigation indien nodig
7. [ ] Test breadcrumbs en back-navigatie
8. [ ] Verwijder oude anchor-sidebar code

---

## Gerelateerde Documenten

- `docs/design/SETTINGS_PAGE_PATTERNS.md` - Formulier en card patterns
- `src/lib/settingsRouteConfig.ts` - Route configuraties
- `src/components/settings/layouts/` - Layout componenten
