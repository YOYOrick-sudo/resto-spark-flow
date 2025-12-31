# Nesto Operations - Migration Plan

> **Source of Truth**: `globals.css` + `polar-ui.css` (geüpload door gebruiker)  
> **Laatst bijgewerkt**: December 2024

---

## 📊 Huidige Status Dashboard

### Design System
- [x] CSS Custom Properties geïmplementeerd (index.css)
- [x] Tailwind config uitgebreid
- [x] Light/Dark mode support
- [x] Typography tokens gesynchroniseerd (H1: 24px, Body: 16px)
- [x] Button radius gecorrigeerd (16px)
- [x] Card radius gecorrigeerd (16px)
- [x] Polar UI CSS classes toegevoegd

### Layout & Navigatie
- [x] AppShell persistent layout
- [x] NestoSidebar (**NIET AANRAKEN**)
- [x] Routing setup

### Polar Components
- [x] NestoButton, NestoCard, NestoInput, etc.
- [x] Polar CSS classes (.polar-btn, .polar-card, .polar-badge, etc.)
- [x] Typography utility classes

### Supabase Integration
- [ ] Database connectie
- [ ] Hooks implementeren
- [ ] RLS policies

---

## 🎨 Design Tokens Reference (Source of Truth)

### Typography
```css
/* Text / H1 - Page Heading */
--text-h1-size: 24px;
--text-h1-line-height: 32px;
--text-h1-weight: 600;

/* Text / Body */
--text-body-size: 16px;
--text-body-line-height: 24px;
--text-body-weight: 400;

/* Text / Secondary */
--text-secondary-size: 15px;
--text-secondary-line-height: 22px;
--text-secondary-weight: 400;

/* Text / Small */
--text-small-size: 13px;
--text-small-line-height: 18px;
--text-small-weight: 400;
```

### Colors
```css
/* Brand */
--brand-primary: #1d979e;
--brand-primary-light: #E7F9FA;

/* Text */
--text-primary: #17171C;
--text-secondary: #36373A;

/* Surface */
--surface-default: #FFFFFF;
--surface-subtle: #F4F5F6;

/* Border */
--border-subtle: #ECEDED;
```

### Border Width Hierarchy
```css
--border-width-thin: 1px;       /* search inputs (standaard) */
--border-width-standard: 1.5px; /* interactive elements, focus states */
--border-width-emphasis: 2px;   /* belangrijke status indicators */
```

### Radius
```css
--radius-button: 16px;
--radius-card: 16px;
--radius-input: 8px;
--radius-md: 8px;
--radius-lg: 16px;
```

### States
```css
/* Selected */
--selected-border: rgba(29, 151, 158, 0.5);
--selected-background: #F0FAFA;
--selected-color: #1d979e;

/* Focus */
--focus-border: rgba(29, 151, 158, 0.7);

/* Hover */
--hover-on-subtle: var(--surface-default);  /* #F4F5F6 → #FFFFFF */
--hover-on-default: var(--surface-subtle);  /* #FFFFFF → #F4F5F6 */
```

---

## 📅 Fase Planning

### ✅ Fase 0: Voorbereiding (Compleet)
- [x] Lovable project aangemaakt
- [x] Codebase structuur
- [x] Design tokens in index.css (EXACT uit bronbestanden)
- [x] Polar UI CSS classes toegevoegd
- [x] Tailwind config gesynchroniseerd

### ⬜ Fase 1: Database Setup
- [ ] Supabase connecten via Lovable Cloud
- [ ] Tables aanmaken:
  - [ ] `ingredients`
  - [ ] `recipes`
  - [ ] `halffabricaten`
  - [ ] `reservations`
  - [ ] `tasks`
  - [ ] `mep_tasks`
  - [ ] `menu_cards`
  - [ ] `suppliers`

### ⬜ Fase 2: Core Modules (Week 1-2)
- [ ] Ingrediënten CRUD + hooks
- [ ] Kostprijzen berekening
- [ ] Recepten module
- [ ] Halffabricaten module

### ⬜ Fase 3: Operations (Week 3)
- [ ] Reserveringen + REALTIME
- [ ] Taken + REALTIME
- [ ] MEP Taken + REALTIME

### ⬜ Fase 4: Beheer (Week 4)
- [ ] Kaartbeheer
- [ ] Inkoop module
- [ ] Leveranciers beheer
- [ ] Settings modules

---

## ⚠️ Belangrijke Restricties

### 🚫 SIDEBAR: NIET AANRAKEN
De sidebar (`NestoSidebar.tsx`) blijft **EXACT** zoals het nu is.
Geen wijzigingen aan:
- Navigatie structuur
- Styling
- Animaties
- Component logica

### ✅ Bronbestanden = Absolute Waarheid
- `globals.css` en `polar-ui.css` zijn de **ENIGE** source of truth
- **Letterlijk kopiëren**, geen interpretaties
- **Geen HSL conversies** van hex kleuren
- Exacte waardes uit bronbestanden gebruiken

---

## 📝 Verificatie Checklist

Na elke wijziging controleren:

- [ ] `--text-h1-size: 24px` (niet 28px)
- [ ] `--text-body-size: 16px` (niet 15px)
- [ ] `--radius-button: 16px` (niet 8px)
- [ ] `--radius-card: 16px` (niet 12px)
- [ ] Sidebar ONGEWIJZIGD
- [ ] Alle Polar CSS classes aanwezig
- [ ] Dark mode werkt correct

---

## 📁 Bestandsstructuur

```
src/
├── index.css           # Hoofd design tokens + nesto component styles
├── styles/
│   └── polar-ui.css    # Complete Polar UI system
├── components/
│   ├── polar/          # Nesto/Polar component wrappers
│   ├── ui/             # Shadcn UI components
│   └── layout/         # Layout components (incl. sidebar - NIET AANRAKEN)
└── pages/              # Route pagina's
```

---

*Dit document wordt automatisch bijgewerkt tijdens de migratie.*
