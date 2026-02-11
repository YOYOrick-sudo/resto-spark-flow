

# Assistent-toggle verduidelijken in fase-instellingen

## Probleem
De huidige UI maakt niet duidelijk wat de Assistent precies doet. De toggle staat er, maar er is geen uitleg. Gebruikers weten niet welke emails er verstuurd worden of wanneer.

## Wijzigingen

### 1. TaskTemplateList.tsx -- Duidelijker Assistent-label

Bij automatiseerbare taken (`send_email`, `send_reminder`) met de toggle AAN:
- Vervang het generieke "Automatisch" label door een specifiekere beschrijving: "Wordt automatisch verstuurd door de Assistent"
- Voeg een klein info-icoon toe met een Tooltip die uitlegt wat er precies gebeurt: "De Assistent verstuurt deze email automatisch wanneer een kandidaat in deze fase terechtkomt. Je kunt de inhoud aanpassen via E-mailtemplates."

Bij toggle UIT:
- Toon de rol-dropdown zoals nu, maar met een subtiele hint: "Handmatig uitvoeren"

### 2. PhaseConfigCard.tsx -- Collapsed state hint

In de collapsed fase-header: als de fase automatiseerbare taken bevat die AAN staan, toon een compact Mail-icoon + count badge (bijv. "2x") rechts van de fasenaam. Dit geeft in een oogopslag weer hoeveel taken de Assistent afhandelt, zonder de UI druk te maken.

Voorbeeld collapsed:
```text
1. > Sollicitatie ontvangen          [Mail 1x]  Actief [on]
2. > Aanvullende vragen              [Mail 1x]  Actief [on]
3. > Sollicitatiegesprek                         Actief [on]
```

### 3. Edge Function fix -- `is_automated` respecteren

De `completeAutomatedTasks()` in `onboarding-agent/index.ts` filtert nu alleen op `task_type` maar negeert de `is_automated` vlag. Als een gebruiker de Assistent-toggle uitzet voor een email-taak, wordt die taak toch automatisch afgevinkt. Dit moet gefixed worden:

Toevoegen van `.eq('is_automated', true)` aan de query in `completeAutomatedTasks()`, zodat alleen taken waar de toggle AAN staat automatisch worden afgehandeld.

## Technische details

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/onboarding/settings/TaskTemplateList.tsx` | Duidelijker label + info-tooltip bij Assistent-toggle |
| `src/components/onboarding/settings/PhaseConfigCard.tsx` | Mail-count badge in collapsed header |
| `supabase/functions/onboarding-agent/index.ts` | `.eq('is_automated', true)` toevoegen aan query |

### TaskTemplateList.tsx aanpassingen

Row 2 bij automatiseerbare taken met toggle AAN:
- Sparkles icoon + "Assistent" label + Switch (bestaand)
- Mail icoon + "Wordt automatisch verstuurd" tekst
- Info (HelpCircle) icoon met Tooltip: "De Assistent verstuurt deze email automatisch wanneer een kandidaat deze fase bereikt. Pas de inhoud aan via het tabblad E-mailtemplates."

Row 2 bij toggle UIT:
- Sparkles icoon + "Assistent" label + Switch (UIT)
- Rol-dropdown (bestaand)

### PhaseConfigCard.tsx aanpassingen

In de collapsed header-div, na de fasenaam en voor de Actief-toggle:
- Tel het aantal taken met `isAutomatable(task) && task.is_automated !== false`
- Als count > 0: toon `<Mail className="h-3.5 w-3.5 text-primary" />` + `<span className="text-xs text-muted-foreground">{count}x</span>`

### Edge Function fix

```typescript
// In completeAutomatedTasks(), regel 292-298 wijzigen:
const { data: pendingTasks } = await supabaseAdmin
  .from('ob_tasks')
  .select('id, title')
  .eq('candidate_id', candidateId)
  .eq('phase_id', candidate.current_phase_id)
  .in('task_type', ['send_email', 'send_reminder'])
  .eq('is_automated', true)  // NIEUW: respecteer de toggle
  .eq('status', 'pending');
```

### Geen nieuwe dependencies of database-migraties nodig

