
# Website Popup Upgrade — Modulaire Types + Werkpagina

## Status: ✅ AFGEROND

### Wat is gedaan:

1. **Database migratie** — `popup_type` (TEXT, default 'newsletter') en `custom_button_url` (TEXT) kolommen toegevoegd aan `marketing_popup_config`. `featured_ticket_id` bestond al.

2. **Hook update** — `usePopupConfig.ts` uitgebreid met `PopupType` type export en nieuwe velden.

3. **PopupPage** (`/marketing/popup`) — Nieuwe werkpagina met:
   - Type kiezer (Reservering / Nieuwsbrief / Custom)
   - Conditionele velden per type
   - Weergave-instellingen (exit-intent, timed, sticky bar)
   - Live preview met browser viewport simulatie
   - Autosave met debounce

4. **Edge functions** — `marketing-popup-config` stuurt `popup_type` en `custom_button_url` mee. `marketing-popup-widget` rendert conditioneel per type (reservation: ticket-card + CTA, newsletter: email form, custom: link button).

5. **Navigatie** — "Website Popup" toegevoegd aan marketing sub-menu en route in App.tsx.

6. **Settings vereenvoudigd** — `PopupSettingsTab` teruggebracht tot embed code + link naar werkpagina.
