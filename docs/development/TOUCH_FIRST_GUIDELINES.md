# Touch-First Guidelines (Soft Principle)

**Status:** Soft principle voor toekomstige sprints. Niet enforced via tooling. Wordt gevalideerd in pre-launch UI-audit.

**Context:** Nesto is desktop-first (zie `mem://style/desktop-first-constraint`), maar bepaalde routes worden in productie operationeel op iPad gebruikt (keuken, service, ontvangst). Voor die routes geldt onderstaande extra check.

---

## Operationele Routes (touch-first applicable)

Routes waar de eindgebruiker dagelijks op een iPad/tablet werkt tijdens operations:

| Route | Persona | Context |
|---|---|---|
| `/keuken/mep` | Chef / sous-chef | iPad hangend, vuile vingers, haast |
| `/keuken/haccp` | Chef / KAM | Check-off tijdens shift |
| `/keuken/inkoop/ontvangst` | Magazijn / chef | Pakbon scanning, bestelling-aanname |
| `/reserveringen` (dashboard) | Service / host | Hand-held, gedimd licht |
| `/voorraad` (snelle update) | Chef | Telling-flow |

Alle overige settings/management/admin routes blijven **desktop-first** zonder touch-aanpassingen.

---

## Touch-First Regels (op operationele routes)

### 1. Tap-target minimum 44px (`h-11`)
- Knoppen, checkboxes, toggle-rijen: minimum hoogte 44 CSS-pixels
- Tailwind: `h-11` (44px) of groter
- Geen `h-8` / `h-9` op operationele routes

### 2. Geen hover-only critical actions
- Quick-actions (bevestigen, afronden, wijzigen) moeten **altijd zichtbaar** zijn — geen `opacity-0 group-hover:opacity-100`
- Tooltips zijn OK voor info, maar mogen geen primary-actie verbergen
- Status moet zichtbaar zijn zonder hover

### 3. Vuile-vingers tolerantie
- Spacing tussen actie-buttons: minimum 8px (`gap-2`)
- Geen drag/swipe-gestures als primary input op kritieke flows
- Geen long-press requirements voor standaard acties
- Bevestiging vereist voor destructieve acties (delete, cancel)

### 4. Snelheid: kritieke actie in ≤2 taps
- Vanaf operationeel hoofdscherm bereikbaar in maximaal 2 taps:
  - Taak afvinken
  - Reservering bevestigen
  - Bestelling ontvangen
- Géén modal-in-modal-in-modal flows

### 5. Contrast bij wisselend licht
- Status-badges leesbaar bij fel licht (keuken) én gedimd licht (service)
- Geen low-contrast text op kritieke info (`text-muted-foreground/60` vermijden)
- Verifieer met design-tokens — geen hardcoded grijswaarden

---

## Workflow voor nieuwe features

Bij het bouwen van een feature die op een operationele route landt:

1. **Identificeer:** raakt deze feature een operationele route? (zie tabel hierboven)
2. **Toepassen:** als ja, voeg een commentaar toe in de root-component:
   ```tsx
   // TOUCH-FIRST: zie docs/development/TOUCH_FIRST_GUIDELINES.md
   // Operationele route — h-11 minimum, geen hover-only critical actions.
   ```
3. **Build:** alle interactieve elementen voldoen aan de 5 regels
4. **Pre-launch audit valideert:** dimensie 4 + dimensie 7 van `docs/audits/UI_AUDIT_LAUNCH_PLAN.md`

---

## Niet van toepassing

- **Settings-modules** (`/instellingen/*`) — desktop-first, blijven `h-9`/`h-10`
- **Admin/Owner-rapportages** — MacBook-context
- **Onboarding-wizards** — eenmalig, desktop OK
- **Boekingswidget** (`/book/:slug`) — eigen mobile-first standaard, valt buiten dit document

---

## Toekomstige beslissing: dual-view

Een aparte iPad-geoptimaliseerde view (i.p.v. één responsive view) is **bewust uitgesteld** tot na Pura Vida testfase. Beslissing wordt genomen op basis van real-world data.

Tot die tijd: deze soft-principle is voldoende voor operationele routes.
