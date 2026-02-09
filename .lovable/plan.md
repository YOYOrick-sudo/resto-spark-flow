
# Stap 3: Kandidaat Detail Panel + Taken

Bouw een slide-over sheet dat opent bij klik op een kandidaatkaart. Hierin kan de operator taken afvinken, kandidaten afwijzen, en de tijdlijn bekijken.

---

## Overzicht

Een Sheet component (ShadCN) dat van rechts inschuift met 3 tabs: Taken, Info, en Tijdlijn. Inclusief sticky footer met actieknoppen (Afwijzen / Doorgaan). Taken afvinken triggert automatische fase-overgang via bestaande database triggers.

---

## Wat wordt gebouwd

### Data hooks (5 stuks)

| Hook | Beschrijving |
|------|-------------|
| `useOnboardingTasks` | Taken ophalen per kandidaat met fase-join |
| `useCompleteTask` | Taak markeren als completed, invalidates tasks + candidates + events |
| `useRejectCandidate` | Kandidaat afwijzen: status op rejected, taken skippen, event loggen |
| `useOnboardingEvents` | Tijdlijn events ophalen per kandidaat |
| `useSaveEvaluation` | Evaluatie opslaan als onboarding_event |

### Componenten (8 stuks)

| Component | Beschrijving |
|-----------|-------------|
| `CandidateDetailSheet` | Sheet wrapper met header, tabs, en sticky footer |
| `CandidateHeader` | Naam, email, status badge, huidige fase |
| `PhaseTaskList` | Taken gegroepeerd per fase, huidige fase open, eerdere collapsed |
| `TaskItem` | Enkele taak met checkbox, titel, rol-badge |
| `CandidateInfo` | Contactgegevens en notities |
| `CandidateTimeline` | Chronologische event-lijst met iconen |
| `EvaluationForm` | Sterren-rating + aanbeveling voor fase 4/5 |
| `CandidateActions` | Sticky footer met Afwijzen/Doorgaan knoppen |

### Aanpassingen bestaande code

- `OnboardingPage.tsx`: state toevoegen voor `selectedCandidateId`, sheet renderen
- `PipelineBoard.tsx`: `onCandidateClick` doorpassen (al aanwezig als prop)
- `index.ts`: barrel exports uitbreiden

---

## Belangrijke technische details

### Database: geen `rejected_at` kolom
De `onboarding_candidates` tabel heeft GEEN `rejected_at` kolom. De `useRejectCandidate` hook zal alleen `status` updaten naar `'rejected'`, niet een onbestaande kolom proberen te zetten.

### Taak-completie flow
1. Gebruiker vinkt checkbox aan
2. `useCompleteTask` update `ob_tasks.status` naar `'completed'`
3. Database trigger `check_onboarding_phase_completion` checkt of alle taken klaar zijn
4. Bij alles klaar: kandidaat verplaatst naar volgende fase (of `hired`)
5. Query invalidatie refresht board + sheet automatisch

### "Doorgaan" knop
De knop is eigenlijk overbodig omdat de database trigger de fase-overgang afhandelt bij taak-completie. De knop dient als visuele bevestiging:
- Disabled wanneer niet alle taken completed/skipped
- Wanneer wel alle taken klaar: de trigger heeft al gefired, dus de knop toont bevestiging en refresht de UI

### Sheet structuur

```text
+---------------------------------------+
| [X]  Jan Jansen                       |
|       jan@email.nl                    |
|       [Actief]  Fase: Screening       |
+---------------------------------------+
| [Taken]  [Info]  [Tijdlijn]          |
+---------------------------------------+
|                                       |
|  -- Screening (huidige fase) --       |
|  [x] Aanvullende vragen sturen        |
|  [ ] Antwoorden beoordelen            |
|                                       |
|  v Aanmelding ontvangen (2/2)         |
|    (collapsed)                        |
|                                       |
+---------------------------------------+
| [Afwijzen]          [Doorgaan ->]     |
+---------------------------------------+
```

### NestoTabs integratie
Gebruikt bestaande `NestoTabs` + `NestoTabContent` componenten met tabs: `taken`, `info`, `tijdlijn`.

### Evaluatieformulier
Getoond in de Taken tab wanneer de huidige fase `sort_order` 40 (Gesprek) of 50 (Meeloopdag) is. Bevat sterren-rating (1-5), aanbeveling select, en notities textarea. Opgeslagen als `onboarding_event` met type `evaluation_saved`.

### Event type mapping voor tijdlijn
Elk event_type krijgt een icoon (lucide-react) en label. Tijdstempels via bestaande `formatDateTimeCompact()`.

### Bestandsstructuur

```text
src/
  hooks/
    useOnboardingTasks.ts         (nieuw)
    useCompleteTask.ts            (nieuw)
    useRejectCandidate.ts         (nieuw)
    useOnboardingEvents.ts        (nieuw)
    useSaveEvaluation.ts          (nieuw)
  components/
    onboarding/
      CandidateDetailSheet.tsx    (nieuw)
      CandidateHeader.tsx         (nieuw)
      CandidateInfo.tsx           (nieuw)
      PhaseTaskList.tsx           (nieuw)
      TaskItem.tsx                (nieuw)
      EvaluationForm.tsx          (nieuw)
      CandidateTimeline.tsx       (nieuw)
      CandidateActions.tsx        (nieuw)
      index.ts                    (update)
  pages/
    OnboardingPage.tsx            (update - add selectedCandidateId state + sheet)
```

### Gebruikte bestaande componenten
- `Sheet` / `SheetContent` (ShadCN, max-w-[520px])
- `NestoTabs` / `NestoTabContent`
- `NestoBadge` (status badges, rol badges)
- `Checkbox` (ShadCN)
- `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` (ShadCN)
- `ConfirmDialog` (bestaand Nesto component)
- `NestoButton`
- `NestoSelect`
- `formatDateTimeCompact()` uit `src/lib/datetime.ts`
- `useAuth()` voor `user.id` (actor bij taken/events)
- `useUserContext()` voor `currentLocation`
