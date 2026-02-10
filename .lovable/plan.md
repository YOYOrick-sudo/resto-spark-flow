
# Fase 4.4A — Database Fundament: Tickets & Beleid (v3)

> **Lees eerst `docs/FASE_4_4_TICKETS.md` voor het volledige concept.**

## Status: ✅ AFGEROND

Migration uitgevoerd, TypeScript types aangemaakt, query keys geregistreerd, seed data geverifieerd.

## Wat is aangemaakt

### Database
- **`policy_sets`** — herbruikbare spelregels (betaling, annulering, no-show, herbevestiging)
- **`tickets`** — het product dat de gast boekt, met directe `policy_set_id` FK
- **`shift_tickets`** — brug tussen product en tijd, met gedenormaliseerde `location_id` voor RLS

### Triggers
- `update_tickets_updated_at` / `update_policy_sets_updated_at`
- `trg_enforce_single_default_ticket` — max 1 default per location
- `trg_sync_shift_ticket_location` — synced location_id vanuit shifts
- `trg_auto_create_default_ticket` — default ticket + policy bij nieuwe location

### RLS
- SELECT: `user_has_location_access` op alle 3 tabellen
- INSERT/UPDATE/DELETE: `user_has_role_in_location` (owner/manager) op alle 3 tabellen

### RPCs
- `get_bookable_tickets(location_id, date)` — inclusief shift_exceptions check
- `get_ticket_with_policy(ticket_id)` — ticket + joined policy_set
- `get_shift_ticket_config(shift_id, ticket_id)` — COALESCE merge
- `get_next_ticket_sort_order(location_id)` — stap 10
- `reorder_tickets(location_id, ticket_ids[])` — alle guards uit reorder_areas

### TypeScript
- `src/types/tickets.ts` — alle interfaces en constanten
- `src/lib/queryKeys.ts` — 5 nieuwe query keys

### Seed Data
- Default "Standaard" policy set + "Reservering" ticket voor test-locatie `22222222-...`

## Volgende stap: Sessie B — Signalen
