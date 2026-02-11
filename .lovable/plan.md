

# Assistent Vereenvoudigen + InfoAlert Cleanup

Twee samenhangende wijzigingen: (1) vereenvoudig het Assistent-model naar een enkele locatie-toggle, en (2) vervang resterende InfoAlert banners door FieldHelp/TitleHelp.

---

## Ding 1: Assistent vereenvoudigen

### Database migratie

1. **Kolom toevoegen:** `ob_tasks.task_type` (text, NOT NULL, default `'other'`)
2. **Kolom toevoegen:** `onboarding_settings.assistant_enabled` (boolean, NOT NULL, default `true`)
3. **Kolom verwijderen:** `onboarding_phases.assistant_enabled`
4. **DB functies updaten:** `generate_initial_onboarding_tasks` en `advance_onboarding_phase` — `task_type` meenemen uit template JSON via `COALESCE(_task->>'task_type', 'other')`
5. **Seed data migratie:** bestaande `task_templates` JSON in `onboarding_phases` updaten zodat email-taken `task_type: 'send_email'` krijgen en de rest `task_type: 'manual'`

### Frontend wijzigingen

**`PhaseConfigSection.tsx`** — Assistent-kaart bovenaan
- Voeg een `NestoCard` toe **boven** de faselijst met:
  - Sparkles icoon + "Assistent" titel + Switch toggle (leest/schrijft `onboarding_settings.assistant_enabled`)
  - Opsomming van 8 concrete acties (email-iconen + tekst, read-only)
  - Hint onderaan: "Je kunt de inhoud van deze emails aanpassen via het tabblad 'E-mailtemplates'."
- Importeert `useOnboardingSettings` en `useUpdateOnboardingSettings` voor de toggle

**`PhaseConfigCard.tsx`** — Opschonen
- Verwijder Sparkles icoon uit collapsed header (regels 70-87)
- Verwijder Assistent toggle uit expanded view (regels 148-161)
- Verwijder `assistant_enabled` uit de `onUpdate` prop-type
- Verwijder `hasAutomatedTasks` en `assistantEnabled` variabelen

**`TaskTemplateList.tsx`** — Conditionele taak-rijen
- `TaskTemplate` interface: voeg `task_type?: string` toe, verwijder `is_automated`
- Definieer `AUTOMATABLE_TYPES = ['send_email', 'send_reminder']`
- Row 2 logica:
  - Als `task_type` in `AUTOMATABLE_TYPES`: toon read-only label met mail-icoon + "Automatisch (Assistent)" in `text-primary text-sm`. Geen toggle, geen dropdown.
  - Anders: toon rol-dropdown. Geen Assistent-toggle.
- `addTask()`: nieuwe taken krijgen `task_type: 'manual'` default
- Verwijder alle `is_automated` toggle logica

**`TaskItem.tsx`** (pipeline board) — Sparkles behouden
- Geen wijziging: Sparkles iconen bij `is_automated = true` taken blijven zichtbaar op het pipeline board (achteraf indicator bij uitgevoerde acties)

**`TeamOwnersSection.tsx`** — Assistent-kolom verwijderen
- Verwijder de 4e kolom "Assistent" uit de grid (header + rijen)
- Grid wordt `grid-cols-[auto_1fr_1fr_80px]` naar `grid-cols-[auto_1fr_1fr_auto]` (of 3 kolommen met edit-knop)

**`useUpdatePhaseConfig.ts`** — Opschonen
- Verwijder `assistant_enabled` uit de `PhaseUpdate` interface

### Edge Function wijziging

**`onboarding-agent/index.ts`** — `completeAutomatedTasks()`
- Voeg een check toe: lees `onboarding_settings.assistant_enabled` voor de locatie
- Als `false`: skip alle automatische acties (geen emails, geen task completion)
- Filter op `task_type` in (`send_email`, `send_reminder`) in plaats van `is_automated = true`
- De `is_automated` kolom op `ob_tasks` blijft bestaan (backward compat voor pipeline board weergave) maar wordt niet meer als filter gebruikt door de agent

---

## Ding 2: InfoAlert banners vervangen

Drie resterende InfoAlerts op de Onboarding settings pagina:

| Locatie | Huidige InfoAlert | Vervanging |
|---------|-------------------|------------|
| `TeamOwnersSection.tsx` regels 110-113 | "Verantwoordelijken ontbreken" | **Behouden** -- dit is een actionable status-melding, geen uitleg |
| `EmailTemplatesSection.tsx` regels 59-62 | "Templates incompleet" | **Behouden** -- dit is een actionable status-melding |
| `ReminderSettingsSection.tsx` | Al vervangen door TitleHelp | Geen actie |

Conclusie: de resterende InfoAlerts zijn actionable status-meldingen (niet uitleg) en blijven behouden. Punt 6 uit het eerdere plan is al volledig uitgevoerd.

---

## Technische details

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/migrations/...` | `ob_tasks.task_type`, `onboarding_settings.assistant_enabled`, drop `onboarding_phases.assistant_enabled`, update DB functies, seed data |
| `src/components/onboarding/settings/PhaseConfigSection.tsx` | Assistent-kaart bovenaan toevoegen |
| `src/components/onboarding/settings/PhaseConfigCard.tsx` | Sparkles + Assistent toggle verwijderen |
| `src/components/onboarding/settings/TaskTemplateList.tsx` | Conditionele rijen op basis van `task_type`, `is_automated` toggle weg |
| `src/components/onboarding/settings/TeamOwnersSection.tsx` | Assistent-kolom verwijderen |
| `src/hooks/useUpdatePhaseConfig.ts` | `assistant_enabled` uit interface |
| `src/hooks/useOnboardingSettings.ts` | (ongewijzigd, wordt hergebruikt) |
| `supabase/functions/onboarding-agent/index.ts` | Check `assistant_enabled`, filter op `task_type` |

### Geen nieuwe bestanden of dependencies nodig

