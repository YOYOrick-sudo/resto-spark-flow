

# MEP "Plan mijn dag" — Assistent scheduling

## Overzicht

Client-side scheduling algoritme dat openstaande MEP taken ordent in een slim stappenplan. Passieve wachttijd wordt gevuld met andere taken. Geen API calls — puur berekend op basis van `actieve_bereidingstijd` en `passieve_bereidingstijd` van het recept.

## Nieuwe bestanden

### `src/utils/mepDayPlanner.ts`
Scheduling algoritme:
- **Input**: array `MepTask[]` + optionele `startTime` (default: nu, of 09:00 als voor 09:00)
- **Output**: `PlannedStep[]` met `task_id`, `task_title`, `start_time`, `active_minutes`, `passive_minutes`, `is_followup`, `note`
- **Logica**:
  1. Filter op openstaande taken (pending/in_progress)
  2. Taken met status "in_progress" eerst
  3. Sorteer rest: langste passieve tijd eerst, dan deadline urgentie, dan prioriteit
  4. Greedy scheduling met tijdlijn + wacht-queue
  5. Vul passieve wachttijd op met korte actieve taken
  6. Voeg "afmaken" follow-up stappen toe (geschatte duur: `actieve_bereidingstijd / 4`, min 5 min)
  7. Defaults: 15 min actief, 0 min passief als recept ontbreekt

### `src/components/mep/MepDayPlan.tsx`
Panel component (NestoPanel, 460px):
- Genummerde stappen (①②③④) met starttijd, taaknaam, tijdsindicatie
- Follow-up stappen met "↩ Vervolg" label
- Geschatte eindtijd onderaan
- "Pas toe" knop: sorteert takenlijst client-side (React state, geen DB)
- "Sluiten" knop

## Gewijzigde bestanden

### `src/pages/MepTaken.tsx`
- Import `MepDayPlan`
- State: `planOpen` boolean + `planOrder` (string[] task IDs, null = geen override)
- "Plan mijn dag" knop naast de view toggles, zichtbaar bij ≥2 openstaande taken
- Bij "Pas toe": sla `planOrder` op in state, pas sorting toe op `dayTasks` voor de views
- `planOrder` reset bij datum-navigatie

## Technische details

- Geen database wijzigingen (V1: client-side sort only)
- MepTask heeft al `recept.actieve_bereidingstijd` en `recept.passieve_bereidingstijd` via de join
- NestoPanel wordt hergebruikt voor het plan-panel (consistent met rest van de app)
- Knop styling: `variant="outline"` met sparkles icoon, past bij bestaande header actions

