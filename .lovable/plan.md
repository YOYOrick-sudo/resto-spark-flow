

# Stap 1 Fix: Complete Onboarding Module Database Schema

De vorige migratie is niet uitgevoerd -- er bestaan nog geen onboarding tabellen (behalve de oude `onboarding_tasks` voor employee onboarding). We moeten alles van scratch opbouwen.

---

## Wat er nu bestaat
- Oude `onboarding_tasks` tabel (employee onboarding checklist met `employee_id`, `key`, `status`) -- dit is een ANDER systeem
- `module_key` enum heeft nog GEEN `onboarding` waarde
- `onboarding_status` type bestaat niet
- Geen van de onboarding recruitment tabellen bestaan

## Wat wordt aangemaakt

### 1. Enum types
- `onboarding` toevoegen aan `module_key`
- Nieuw type `onboarding_status` (`active`, `hired`, `rejected`, `withdrawn`, `no_response`, `expired`)

### 2. Tabellen (6 stuks)

| Tabel | Beschrijving |
|-------|-------------|
| `onboarding_phases` | 10 fasen per locatie met `description` en `task_templates` (JSONB) |
| `onboarding_candidates` | Kandidaten in de pipeline met status, fase, contactgegevens |
| `onboarding_phase_logs` | Fase-overgang historie |
| `onboarding_settings` | E-mailtemplates en reminder config per locatie |
| `ob_tasks` | Taken per kandidaat per fase (hernoemd om conflict met bestaande `onboarding_tasks` te vermijden) |
| `onboarding_events` | Breed audit log voor alle acties |
| `workflow_executions` | Idempotency tabel voor Edge Functions |

**Naamgeving `ob_tasks`**: De bestaande `onboarding_tasks` tabel is het employee onboarding checklist systeem. Om conflicten te vermijden gebruiken we `ob_tasks` voor de recruitment pipeline taken. Alternatief: hernoemen naar `recruitment_tasks` -- dit is een keuze.

### 3. RLS Policies
Alle tabellen volgen het Nesto-patroon:
- SELECT: `user_has_location_access()` + `is_platform_user()`
- INSERT/UPDATE/DELETE: `user_has_role_in_location(owner, manager)`
- `onboarding_events`: INSERT voor alle location users, geen UPDATE/DELETE
- `workflow_executions`: alleen platform admin SELECT, rest via service_role

### 4. Permissions (6 stuks)
- `onboarding.view`, `onboarding.candidates.view`, `onboarding.candidates.edit`
- `onboarding.phases.view`, `onboarding.phases.edit`, `onboarding.settings`
- Gekoppeld aan `owner_default` en `manager_default` permission sets

### 5. Triggers & Functions
- `generate_initial_onboarding_tasks()`: bij INSERT op candidates, genereert taken uit fase 1 templates
- `check_onboarding_phase_completion()`: bij UPDATE van taak-status, checkt of alle taken klaar zijn en verplaatst kandidaat naar volgende fase (of zet status op `hired`)
- `update_updated_at_column()` triggers op alle tabellen met `updated_at`

### 6. Seed data
- 10 standaard fasen voor test-locatie `22222222-...`
- E-mailtemplates en reminder config
- Entitlement-rij voor bestaande locatie

### 7. TypeScript update
- `src/types/auth.ts`: `'onboarding'` toevoegen aan `ModuleKey` union type

---

## Technische details

### Naamconflict `onboarding_tasks`

De bestaande tabel `onboarding_tasks` (kolommen: `employee_id`, `key`, `status`, `completed_at`) is het employee onboarding checklist systeem. De nieuwe recruitment pipeline taken-tabel heeft een compleet ander schema (`candidate_id`, `phase_id`, `assigned_role`, etc.).

Oplossing: de nieuwe tabel heet `ob_tasks` om het conflict te vermijden. De bestaande tabel en zijn RLS policies blijven onaangeroerd.

### Migratie volgorde (kritisch voor FK constraints)

```text
1. ALTER TYPE module_key ADD VALUE 'onboarding'
2. CREATE TYPE onboarding_status
3. CREATE TABLE onboarding_phases (geen FK dependencies behalve locations)
4. CREATE TABLE onboarding_candidates (FK naar phases)
5. CREATE TABLE onboarding_phase_logs (FK naar candidates + phases)
6. CREATE TABLE onboarding_settings (FK naar locations)
7. CREATE TABLE ob_tasks (FK naar candidates, phases, locations)
8. CREATE TABLE onboarding_events (FK naar candidates, locations)
9. CREATE TABLE workflow_executions (geen FK)
10. RLS policies op alle tabellen
11. Triggers en functions
12. Permissions seed
13. Data seed (fasen, settings, entitlements)
```

### Seed data locatie
Test-locatie ID: `22222222-2222-2222-2222-222222222222`

