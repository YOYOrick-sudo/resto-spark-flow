
# Ronde 1: Widget V2 Foundation ✅ AFGEROND

## Status: Compleet

### Wat is gedaan:
- [x] Database migratie: `widget_style` kolom + validatie trigger (met search_path fix)
- [x] API `/config` endpoint: tickets array, accent_color, widget_style, active_ticket_count + `is_active` → `status` bug fix
- [x] `widget.js`: Slide-in panel (420px desktop, fullscreen mobiel) i.p.v. centered modal
- [x] `BookingWidget.tsx`: Panel container met header, X knop, progress dots, embed awareness
- [x] `BookingContext.tsx`: WidgetConfig uitgebreid, effectiveStyle/totalSteps, selectedTicket, 4/5 stap logic
- [x] `BookingProgress.tsx`: Pill-dots (8px/24px), dynamisch 4/5 stappen
- [x] `useWidgetSettings.ts`: widget_style in interface
- [x] `SettingsReserveringenWidget.tsx`: Widget stijl selector (Auto/Showcase/Quick)

---

# Ronde 2: Visuele Redesign ✅ AFGEROND

## Status: Compleet

### Wat is gedaan:
- [x] `BookingContext.tsx`: STEP_MAP object + `goToStep(name)` / `goBack()` navigatie helpers (geen hardcoded nummers meer)
- [x] `TicketSelectStep.tsx`: Showcase ticket kaarten met 3:2 foto of gradient+letter fallback, party size range, hover animatie
- [x] `DateGuestsStep.tsx`: NL locale (maandag start), today ring indicator, pill-button "gasten" label, dynamische terug-knop in showcase
- [x] `TimeTicketStep.tsx`: Grid layout zonder clock icons, squeeze slots met accent-kleur border+tekst, ticket info banner in showcase mode
- [x] `GuestDetailsStep.tsx`: Accent-kleur welkom-terug banner, focus ring met primaryColor, text-xs labels
- [x] `ConfirmationStep.tsx`: Geanimeerd SVG checkmark (stroke-dasharray cirkel → fill → vinkje), 20px titel
- [x] `BookingWidget.tsx`: TicketSelectStep import + showcase routing

---

# Ronde 3: Settings + Polish

## Status: Nog te starten

### Taken:
- [ ] Skeleton loading states (kalender, tijdslot grid)
- [ ] Stap transities (slide left/right + fade)
- [ ] Micro-interacties (button hover/press, slot selectie pop)
- [ ] prefers-reduced-motion support
- [ ] Accessibility audit (ARIA, keyboard nav, contrast)
