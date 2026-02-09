

# Stap 8: Settings > Onboarding — Implementatieplan

## Overzicht

Nieuwe settings pagina op `/instellingen/onboarding` met 4 tabs: Fasen, E-mailtemplates, Reminders, Email configuratie. Volgt bestaande settings-architectuur.

---

## 1. Database migratie

- `email_config` JSONB kolom toevoegen aan `onboarding_settings` (default: `{"sender_name": "", "reply_to": ""}`)
- `reminder_enabled: true` toevoegen aan bestaande `reminder_config` records
- Seed de test-locatie met defaults

---

## 2. Navigatie-integratie

**`src/lib/navigation.ts`**:
- ROUTE_MAP: `'settings-onboarding': '/instellingen/onboarding'`
- Sidebar sub-item onder Settings: `{ id: 'settings-onboarding', label: 'Onboarding', path: '/instellingen/onboarding' }`
- `getExpandedGroupFromPath`: `/instellingen` al afgehandeld (returns `'settings'`)

**`src/App.tsx`**: nieuwe route `/instellingen/onboarding` -> `SettingsOnboarding`

---

## 3. Hooks (4 bestanden)

| Hook | Tabel | Functie |
|------|-------|---------|
| `useOnboardingSettings` | `onboarding_settings` | Query: haalt settings op voor locatie |
| `useUpdateOnboardingSettings` | `onboarding_settings` | Mutation: update `email_templates`, `reminder_config`, of `email_config` (generiek, accepteert partial update) |
| `useAllOnboardingPhases` | `onboarding_phases` | Query: alle fasen inclusief inactieve, gesorteerd op sort_order |
| `useUpdatePhaseConfig` | `onboarding_phases` | Mutation: update `is_active`, `description`, `task_templates` per fase |

Scheiding: settings-tabel via generieke hook, phases-tabel via specifieke hook.

---

## 4. Components (10 bestanden)

### Route pagina
- `src/pages/settings/SettingsOnboarding.tsx` — SettingsDetailLayout + NestoTabs (4 tabs)

### Tab 1: Fasen
- `PhaseConfigSection.tsx` — lijst van PhaseConfigCards
- `PhaseConfigCard.tsx` — NestoCard per fase: naam (read-only), beschrijving (bewerkbaar), is_active toggle, expandable taken
- `TaskTemplateList.tsx` — taken editor: titel input, role dropdown, is_automated toggle, toevoegen/verwijderen

### Tab 2: E-mailtemplates
- `EmailTemplatesSection.tsx` — lijst van alle 9 templates
- `EmailTemplateEditor.tsx` — subject input + body textarea + variabelen-chips (toevoegen aan einde, geen cursor tracking voor MVP) + live preview met voorbeelddata

### Tab 3: Reminders
- `ReminderSettingsSection.tsx` — toggle + 3 numerieke velden (disabled wanneer toggle uit), autosave met inline indicator

### Tab 4: Email config
- `EmailConfigSection.tsx` — sender_name input + reply_to email input + info-tekst over platform domein

### Barrel export
- `src/components/onboarding/settings/index.ts`

---

## 5. Edge Function update

**`supabase/functions/_shared/email.ts`**:
- Bij het versturen van een email: haal `email_config` op uit `onboarding_settings` voor de betreffende `location_id`
- Gebruik `sender_name` in het `from` veld: `{sender_name} <noreply@nesto.app>` (fallback naar huidige default)
- Gebruik `reply_to` in de Resend payload (als ingevuld)
- Dit voegt een extra DB query toe per email — acceptabel voor onboarding volumes

---

## 6. Autosave patroon

- Debounced (800ms) autosave bij wijziging van tekstvelden
- Directe save bij toggles en dropdowns
- Inline "Opgeslagen" indicator (geen toast bij autosave)
- Toast bij expliciete acties: taak toevoegen/verwijderen

---

## 7. Permission gating

- Pagina checkt `onboarding.manage` permissie via bestaande `usePermission` hook
- Zonder permissie: redirect naar dashboard of lege state

---

## Volgorde van uitvoering

1. Database migratie (email_config kolom + reminder_enabled seed)
2. Hooks (4 bestanden, parallel)
3. Components (10 bestanden, parallel)
4. Route + navigatie integratie
5. Edge Function update (email.ts)
6. Deploy edge function

---

## Gewijzigde bestaande bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/App.tsx` | Route toevoegen |
| `src/lib/navigation.ts` | Sidebar item + ROUTE_MAP |
| `supabase/functions/_shared/email.ts` | email_config ophalen + gebruiken |

## Nieuwe bestanden (15)

- 1 database migratie
- 4 hooks
- 9 components + 1 barrel export
- 1 route pagina

