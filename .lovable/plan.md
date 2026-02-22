
# AI Popup Suggesties — Wekelijkse Voorstellen met Leercyclus

## Status: ✅ AFGEROND

### Wat is gedaan:

1. **Database migratie** — `marketing_popup_suggestions` tabel aangemaakt met `popup_type`, `headline`, `description`, `featured_ticket_id`, `custom_button_url`, `button_text`, `reasoning`, `status` (pending/accepted/dismissed), `dismiss_reason`. Validation trigger, indexen, RLS met `user_has_location_access`.

2. **Hook** — `usePopupSuggestion.ts` met drie exports: `usePopupSuggestion()` (query pending suggestie met ticket join), `useAcceptPopupSuggestion()` (kopieer naar popup_config + mark accepted), `useDismissPopupSuggestion()` (mark dismissed met reden).

3. **UI componenten**:
   - `PopupSuggestionCard` — Suggestiekaart met headline, description, type badge, ticket naam, reasoning, Toepassen/Afwijzen knoppen.
   - `DismissReasonModal` — Modal met multi-select redenen + vrij tekstveld.

4. **PopupPage integratie** — Suggestiekaart verschijnt bovenaan de pagina wanneer een pending suggestie bestaat.

5. **Edge function** — `marketing-generate-weekplan` uitgebreid met `generatePopupSuggestion()` blok: haalt popup config, tickets, learning history op, genereert via Lovable AI Gateway (tool calling), auto-dismisst oude pending suggesties, slaat nieuwe op. Frequency check: bij 3+ dismissals van laatste 5, alleen genereren bij feestdag.

6. **Signal** — `marketing_popup_suggestion_pending` toegevoegd aan `evaluate-signals` marketing provider. Triggert bij pending suggestie ouder dan 24 uur, cooldown 7 dagen, resolved als geen pending suggesties meer.
