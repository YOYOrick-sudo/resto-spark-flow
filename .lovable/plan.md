

# Detailpagina voor kandidaten (vervangt Split View)

Vervang het inline detail panel door een eigen pagina op `/onboarding/:id`. Wanneer je op een kandidaatkaart klikt, navigeer je naar die pagina. Met de terugknop ga je terug naar de pipeline.

---

## Wat verandert

### Nieuw bestand (1)

| Bestand | Beschrijving |
|---------|-------------|
| `src/pages/OnboardingDetail.tsx` | Detailpagina met `DetailPageLayout`, tabs, en alle kandidaat-logica |

### Gewijzigde bestanden (4)

| Bestand | Wijziging |
|---------|-----------|
| `src/App.tsx` | Route `/onboarding/:id` toevoegen |
| `src/pages/OnboardingPage.tsx` | DetailPanel + Escape handler + scroll effect verwijderen, kaart-klik navigeert naar `/onboarding/:id` |
| `src/components/onboarding/CandidateCard.tsx` | `isSelected` prop verwijderen, `data-candidate-id` verwijderen |
| `src/components/onboarding/PipelineBoard.tsx` + `PhaseColumn.tsx` | `selectedCandidateId` prop verwijderen |

### Verwijderd/ongebruikt (2)

| Bestand | Reden |
|---------|-------|
| `src/components/onboarding/CandidateDetailContent.tsx` | Logica verhuist naar `OnboardingDetail.tsx` |
| `src/components/polar/DetailPanel.tsx` | Niet meer nodig (bewaar als het elders gebruikt wordt, anders verwijderen) |

---

## Nieuwe pagina: `OnboardingDetail.tsx`

Gebruikt het bestaande `DetailPageLayout` component met:
- **backLabel**: "Terug naar pipeline"
- **backHref**: `/onboarding`
- **title**: `{first_name} {last_name}` van de kandidaat
- **headerActions**: Status badge (Actief/Aangenomen/Afgewezen) + fase-naam
- **tabs**: Taken, Info, Tijdlijn
- **Content per tab**: Exact dezelfde componenten als nu in `CandidateDetailContent`

De `CandidateActions` (Afwijzen/Doorgaan knoppen) komen onder de tab-content als een sticky footer of als onderdeel van de headerActions.

### Structuur

```text
DetailPageLayout
  backLabel="Terug naar pipeline"
  backHref="/onboarding"
  title="Jan Jansen"
  headerActions={<NestoBadge>Actief</NestoBadge> <span>Fase: Meeloopdag</span>}
  tabs=[Taken, Info, Tijdlijn]
  activeTab / onTabChange

  TabContent "taken":
    PhaseTaskList + EvaluationForm

  TabContent "info":
    CandidateInfo

  TabContent "tijdlijn":
    CandidateTimeline

  CandidateActions (sticky bottom)
```

---

## OnboardingPage vereenvoudigen

De pipeline pagina wordt weer schoon:
- Geen `selectedCandidateId` state
- Geen `DetailPanel`
- Geen Escape handler
- Geen scroll-to-selected effect
- Kaart-klik: `navigate(\`/onboarding/${candidate.id}\`)`

---

## Routing

In `App.tsx` voeg toe:

```text
<Route path="/onboarding/:id" element={<OnboardingDetail />} />
```

Onder de bestaande `/onboarding` route.

---

## Technische details

### OnboardingDetail.tsx -- hooks en logica

Alle hooks uit `CandidateDetailContent` verhuizen hierheen:
- `useParams()` voor `id`
- `useOnboardingCandidates`, `useOnboardingTasks`, `useOnboardingEvents`, `useOnboardingPhases`
- `useCompleteTask`, `useRejectCandidate`, `useSaveEvaluation`
- `useAuth`, `useUserContext`, `useQueryClient`

Bij afwijzen: `navigate('/onboarding')` na succesvolle reject.

### CandidateCard vereenvoudigen

- Verwijder `isSelected` prop en bijbehorende styling
- Verwijder `data-candidate-id` attribuut
- `onClick` wordt `() => navigate(\`/onboarding/${candidate.id}\`)` (doorgegeven vanuit parent)

### PipelineBoard + PhaseColumn

- Verwijder `selectedCandidateId` prop
- `onCandidateClick` callback blijft, maar navigeert nu in plaats van state te zetten

### DetailPanel.tsx

Wordt nergens meer gebruikt na deze wijziging. Kan verwijderd worden, of bewaard voor toekomstig hergebruik (dan als los component zonder actieve imports).

---

## Samenvatting bestanden

| Bestand | Actie |
|---------|-------|
| `src/pages/OnboardingDetail.tsx` | Nieuw -- detailpagina |
| `src/App.tsx` | Route toevoegen |
| `src/pages/OnboardingPage.tsx` | Vereenvoudigen, DetailPanel + state weg |
| `src/components/onboarding/CandidateCard.tsx` | `isSelected` weg |
| `src/components/onboarding/PipelineBoard.tsx` | `selectedCandidateId` weg |
| `src/components/onboarding/PhaseColumn.tsx` | `selectedCandidateId` weg |
| `src/components/onboarding/CandidateDetailContent.tsx` | Verwijderen |
| `src/components/polar/DetailPanel.tsx` | Behouden maar niet meer geimporteerd |

