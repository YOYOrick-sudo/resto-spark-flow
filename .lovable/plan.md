

# Fix: task_type ontbreekt in bestaande task_templates

## Probleem
De seed-migratie die `task_type` moest toevoegen aan bestaande `task_templates` JSON in `onboarding_phases` heeft de data niet correct bijgewerkt. Hierdoor herkent de UI taken zoals "Ontvangstbevestiging sturen" niet als automatiseerbaar en toont de Assistent-toggle niet.

## Oplossing

### 1. Database migratie -- task_type toevoegen aan bestaande JSON

Een migratie die alle `onboarding_phases.task_templates` doorloopt en voor elke taak een `task_type` toevoegt op basis van de titel:
- Taken met "bevestiging", "email", "sturen", "herinnering" in de titel krijgen `task_type: 'send_email'`
- Alle overige taken krijgen `task_type: 'manual'`
- Taken die al een `task_type` hebben worden overgeslagen

### 2. Fallback in de UI -- TaskTemplateList.tsx

Als extra veiligheid: als een taak `is_automated: true` heeft maar geen `task_type`, behandel deze alsof `task_type = 'send_email'`. Dit voorkomt dat de toggle onzichtbaar blijft bij data die nog niet gemigreerd is.

Wijziging in `isAutomatable()`:
```
const isAutomatable = (task) =>
  AUTOMATABLE_TYPES.includes(task.task_type || '') ||
  (task.is_automated === true && !task.task_type);
```

Dezelfde fallback toepassen in `PhaseConfigCard.tsx` voor de `automatedCount` berekening.

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/migrations/...` | Update bestaande task_templates JSON met task_type |
| `src/components/onboarding/settings/TaskTemplateList.tsx` | Fallback in `isAutomatable()` |
| `src/components/onboarding/settings/PhaseConfigCard.tsx` | Fallback in `automatedCount` berekening |
