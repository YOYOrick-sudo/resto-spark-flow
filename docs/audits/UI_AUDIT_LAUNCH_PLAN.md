# Nesto Global UI-Audit — Pre-Launch Plan

**Status:** Plan-document. **NIET uitvoeren tot na Pura Vida testfase.**
**Doel:** Volledige inventarisatie van het visuele systeem en componentgebruik vóór commerciële launch. Resultaat: één auditrapport met geprioriteerde fix-lijst per dimensie, klaar om in sprints te plannen.

---

## Aanpak — 7 dimensies (parallelle inventarisatie)

### Dimensie 1 — Visual Design System + Dark Mode Readiness

**Standaard inventarisatie:**
- `tailwind.config.ts`, `index.css`, `docs/design/COLOR_PALETTE.md`, `ENTERPRISE_TYPOGRAPHY.md` lezen
- Alle CSS-tokens (kleur/spacing/radius/shadow) inventariseren — welke worden ook écht gebruikt vs. dood
- Grep op hardcoded hex/rgb/px-waarden buiten tokens (overtreders lijst)
- Output: token-coverage tabel + lijst van token-overtredingen per pagina

**Dark Mode Readiness uitbreiding:**
- % styling via tokens vs. hardcoded kleuren (per module: Reserveringen, Keuken, Settings, etc.)
- Dark-mode blockers identificeren:
  - Hardcoded `bg-white`, `text-black`, `bg-gray-*`, `border-gray-*`
  - Charts/illustraties met fixed colors
  - Logo's en brand-assets (PNG vs. SVG met currentColor)
  - PDF/print views (separate styling laag)
  - Email templates (inline styles)
- Complexity-inschatting voor dark-mode implementatie per module (S/M/L/XL)
- **Advies:** mee in visual design sprint óf aparte dark-mode sprint?
  - Beslissingsfactoren: aantal blockers, image-assets, klant-vraag

**Deliverable per dimensie:** status (groen/geel/rood), token-coverage % per module, top-10 blockers, complexity per module.

---

### Dimensie 2 — Components Consistency

- Audit van alle Nesto-* componenten in `src/components/polar/` vs. shadcn `src/components/ui/`
- Per component-type (Button, Input, Card, Badge, Dialog/Sheet/Modal): welke varianten bestaan, welke worden gebruikt, welke zijn duplicaat
- Check op pagina's die `ui/button` gebruiken i.p.v. `NestoButton` (en omgekeerd)
- Modal-patroon beslisregel: huidige praktijk vs. memory-richtlijn (panel-over-modal-standard)

**Deliverable:** "1 component per use-case" lijst + migratie-lijst per overtredende pagina.

---

### Dimensie 3 — States

- **Loading:** inventariseer `Spinner`, `Skeleton`, `LoadingStates.tsx` gebruik per route
- **Empty states:** lijst alle pagina's, controleer wie `EmptyState` gebruikt en wie ad-hoc
- **Error:** error-boundaries dekking + toast-error-patronen
- **Success:** nestoToast vs. inline indicator (resultaat van Settings polish batch 1)

**Deliverable:** state-coverage matrix (route × state-type) met gaten gemarkeerd.

---

### Dimensie 4 — Responsive + Keuken Touch-First Context

**Standaard inventarisatie:**
- Tap-target audit: grep op `h-8`/`h-9` knoppen op keuken-routes (moet ≥44px = `h-11`)
- Breakpoint-gebruik: welke pagina's hebben mobile-breakpoints, welke niet
- Widget (`/book/:slug`) mobile-gedrag check
- Desktop-first constraint (memory) bevestigen voor management-routes

**Keuken Touch-First uitbreiding:**
- **Tap-target ≥44px** op operationele routes (MEP, HACCP, Reserveringen-dashboard, Bestelling-ontvangst, Pakbon)
- **Hoverless interaction:** geen hover-only states op kritieke acties — alle info/acties moeten zichtbaar zijn zonder hover
- **Vuile-vingers tolerantie:** geen kleine click-zones, voldoende spacing tussen actie-buttons (min 8px), geen accidentele drag/swipe gestures
- **Snelheid:** kritieke acties bereikbaar in ≤2 taps vanaf operationeel hoofdscherm
- **Contrast bij fel licht én gedimd:** verifieer leesbaarheid op iPad bij keuken-belichting (helder, vetspatten op scherm) én bij service-belichting (gedimd restaurant)

**Deliverable:** per operationele route → touch-readiness scorekaart (5 criteria), failing routes met fix-suggestie.

---

### Dimensie 5 — Accessibility

- **Contrast:** verifieer `text-muted-foreground` op alle achtergrondtokens (WCAG AA = 4.5:1)
- **Keyboard:** `focus-visible:ring` dekking, tab-orde in panels/sheets
- **Screen reader:** `aria-label` op icon-only buttons, `sr-only` headings
- **Form-labels:** alle inputs hebben `<label>` of `aria-label`

**Deliverable:** WCAG AA compliance-rapport per module + automated lighthouse score per route.

---

### Dimensie 6 — Motion

- Inventariseer alle `transition-*`, `animate-*`, `duration-*` waarden in codebase
- Centraliseer naar duration-tokens (150/200/300ms)
- `prefers-reduced-motion` dekking in `index.css`

**Deliverable:** motion-token systeem + lijst van animaties die buiten tokens vallen.

---

### Dimensie 7 — Contextuele Gebruikssimulatie (NIEUW)

Voer voor elk persona een full walk-through uit van de meest gebruikte schermen onder de échte omstandigheden van die persona.

**Persona 1 — Chef in keuken**
- **Context:** vuile vingers, haast, iPad hangend op 40cm afstand, bril met vetspatten, fel licht boven werkbank, oortelefoon met service-gesprekken
- **Schermen om te testen:** MEP-takenlijst, HACCP-checklist, Bestelling-ontvangst, Voorraad-update, Recept-detail, Pakbon-flow
- **Per scherm beoordelen:** leesbaarheid op afstand, tap-target grootte, tolerantie voor accidentele taps, snelheid van check-off
- **Output:** lijst schermen die falen + concrete fix-suggestie per fail

**Persona 2 — Service in gedimd restaurant**
- **Context:** iPad in hand tijdens dienst, gedimd licht, gast naast tafel, snelle interactie tussen tafels
- **Schermen om te testen:** Reserveringen-dashboard, Tafelplattegrond, Reservering-detail, Wachtlijst, Gastportaal-link delen
- **Per scherm beoordelen:** leesbaarheid bij weinig licht, contrast van status-badges, snelheid van quick-actions, fout-tolerantie
- **Output:** lijst schermen die falen + fix-suggestie

**Persona 3 — Owner thuis op MacBook**
- **Context:** rustige avond, externe monitor, koffie, focus op rapportage
- **Schermen om te testen:** Dashboard, Omzet-rapporten, Menu-engineering, Settings-modules, Team-beheer
- **Per scherm beoordelen:** info-dichtheid, hiërarchie, scanbaarheid, opvallendheid van actiepunten
- **Output:** lijst schermen die falen + fix-suggestie

**Persona 4 — Gast op mobiel in bus**
- **Context:** iPhone in 1 hand, schokkende beweging, slechte 4G, haast
- **Schermen om te testen:** Boekingswidget (alle stappen), Gastportaal (`/manage/:token`), Bevestigingsmail-CTA's
- **Per scherm beoordelen:** ladingsnelheid, touch-tolerantie, kort/duidelijk copy, foutherstel bij netwerkverlies
- **Output:** lijst schermen die falen + fix-suggestie

**Deliverable per dimensie:** 4 persona-rapporten + cross-persona top-issues.

---

## Centrale Deliverable

Eén markdown-rapport `docs/audits/UI_AUDIT_LAUNCH.md` met per dimensie:

```text
├── Status (groen/geel/rood)
├── Inventarisatie tabel (wat bestaat, waar gebruikt)
├── Inconsistenties (genummerd)
├── Voorgestelde fix per inconsistentie
└── Complexity (S/M/L) + sprintsuggestie
```

Plus aan het einde:
- **Top-10 launch-blockers** (must-fix vóór commerciële launch)
- **Polish-backlog** (nice-to-have, post-launch)
- **Principle-statements** per dimensie (zodat toekomstige features automatisch consistent blijven)

---

## Werkwijze (bij uitvoering)

1. Parallelle file-inventarisatie (search + view) over alle 7 dimensies
2. Tokens & componenten kruisreferentie
3. Persona-walkthroughs (handmatig + screenshots)
4. Rapport schrijven naar `docs/audits/UI_AUDIT_LAUNCH.md`
5. Samenvatting met top-10 blockers in chat

**Geen code-wijzigingen tijdens audit.** Na akkoord op de bevindingen → per dimensie een eigen bouw-sprint met volledige code-review vooraf (zoals batches 1-3 van Settings polish).

---

## Trigger voor uitvoering

Dit plan wordt geactiveerd na:
1. ✅ Pura Vida testfase afgerond
2. ✅ Real-world feedback verzameld
3. ✅ Beslissing dual-view iPad vs. desktop op basis van data

Tot die tijd: dit document blijft een ongewijzigd plan-baseline.
