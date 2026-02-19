
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

# Ronde 2: Visuele Redesign

## Status: Nog te starten

### Taken:
- [ ] TicketSelectStep.tsx: Showcase ticket kaarten (3:2 foto, naam, beschrijving)
- [ ] DateGuestsStep.tsx: Kalender NL locale, visueel redesign
- [ ] TimeTicketStep.tsx: Grid layout, "Nog X plekken", eindtijd
- [ ] GuestDetailsStep.tsx: Form redesign, returning guest highlight
- [ ] ConfirmationStep.tsx: Success animatie (stroke-dasharray checkmark)

---

# Ronde 3: Settings + Polish

## Status: Nog te starten

### Taken:
- [ ] Skeleton loading states (kalender, tijdslot grid)
- [ ] Stap transities (slide left/right + fade)
- [ ] Micro-interacties (button hover/press, slot selectie pop)
- [ ] prefers-reduced-motion support
- [ ] Accessibility audit (ARIA, keyboard nav, contrast)
