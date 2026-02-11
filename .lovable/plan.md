

# Assistent per taak activeerbaar (binnen fase-instellingen)

De huidige globale Assistent-kaart bovenaan de Fasen-tab wordt verwijderd. In plaats daarvan wordt de assistent-toggle **per taak** getoond, maar alleen bij taken met een automatiseerbaar `task_type`.

---

## Wat verandert

### PhaseConfigSection.tsx -- Assistent-kaart verwijderen

De volledige NestoCard met Sparkles/Assistent (regels 67-95) wordt verwijderd. De imports voor `Sparkles`, `Mail`, `Bell`, `Switch`, `Label`, `NestoCard` (indien niet elders gebruikt), en de `ASSISTANT_ACTIONS` constante worden opgeschoond. De `useOnboardingSettings`/`useUpdateOnboardingSettings` imports en `assistantEnabled`/`handleToggleAssistant` logica worden verwijderd.

### TaskTemplateList.tsx -- Per-taak Assistent toggle

Voor taken met automatiseerbaar `task_type` (`send_email`, `send_reminder`):
- Toon een **Switch toggle** met label "Assistent" en een Mail-icoon
- De toggle leest/schrijft `is_automated` op de taak-template (default `true` voor automatiseerbare types)
- Als de toggle uit staat, verschijnt de rol-dropdown (de taak wordt dan handmatig door iemand uitgevoerd)
- Als de toggle aan staat, toon read-only "Automatisch (Assistent)" label (geen rol-dropdown nodig)

Voor niet-automatiseerbare taken: alleen de rol-dropdown, geen toggle. Zelfde als nu.

Visueel per taak-rij:

```text
Automatiseerbaar + toggle AAN:
+----------------------------------------------+
| Ontvangstbevestiging sturen              [x] |
| [Assistent toggle: ON]  Automatisch          |
+----------------------------------------------+

Automatiseerbaar + toggle UIT:
+----------------------------------------------+
| Ontvangstbevestiging sturen              [x] |
| [Assistent toggle: OFF]  [Manager v]         |
+----------------------------------------------+

Niet-automatiseerbaar:
+----------------------------------------------+
| CV beoordelen                            [x] |
| [Manager v]                                  |
+----------------------------------------------+
```

### addTask() default

Nieuwe taken (handmatig toegevoegd door gebruiker) krijgen `task_type: 'manual'`, `is_automated: false`. Dus geen Assistent-toggle zichtbaar.

### Database -- onboarding_settings.assistant_enabled

De kolom `assistant_enabled` op `onboarding_settings` die net is toegevoegd wordt weer verwijderd -- niet meer nodig omdat de controle nu per taak is.

### Edge Function -- onboarding-agent

De agent filtert op `is_automated = true` (zoals voorheen) in plaats van de globale `assistant_enabled` check. De `task_type` check blijft als extra filter.

---

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/migrations/...` | Drop `onboarding_settings.assistant_enabled` kolom |
| `src/components/onboarding/settings/PhaseConfigSection.tsx` | Verwijder Assistent-kaart, opschonen imports |
| `src/components/onboarding/settings/TaskTemplateList.tsx` | Per-taak Switch toggle voor automatiseerbare types |
| `src/hooks/useOnboardingSettings.ts` | Verwijder `assistant_enabled` referenties indien aanwezig |
| `supabase/functions/onboarding-agent/index.ts` | Verwijder globale `assistant_enabled` check, filter op `is_automated AND task_type` |

