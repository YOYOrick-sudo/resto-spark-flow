

# Split View patroon voor Onboarding

Vervang het Sheet-overlay door een inline detail panel dat rechts opent als onderdeel van de layout. Board krimpt mee, geen overlay/dimming.

---

## Overzicht

Op desktop: kandidaat detail panel verschijnt inline rechts, board kolommen krimpen mee. Op tablet/mobiel: fallback naar bestaand Sheet-overlay gedrag. De geselecteerde kaart krijgt een actieve state. Escape sluit het panel.

---

## Wat wordt gebouwd/gewijzigd

### Nieuwe bestanden (2)

| Bestand | Beschrijving |
|---------|-------------|
| `src/components/polar/DetailPanel.tsx` | Herbruikbaar split-view panel: inline op desktop, Sheet op tablet/mobiel |
| `src/components/onboarding/CandidateDetailContent.tsx` | Alle content uit CandidateDetailSheet, zonder Sheet wrapper |

### Gewijzigde bestanden (5)

| Bestand | Wijziging |
|---------|-----------|
| `OnboardingPage.tsx` | Split-view layout met flex container, Escape handler |
| `PipelineBoard.tsx` | `selectedCandidateId` prop doorpassen |
| `PhaseColumn.tsx` | `selectedCandidateId` prop doorpassen aan CandidateCard |
| `CandidateCard.tsx` | `isSelected` prop + actieve border styling |
| `onboarding/index.ts` | Export CandidateDetailContent, verwijder CandidateDetailSheet export |

### Verwijderd bestand (1)

| Bestand | Reden |
|---------|-------|
| `CandidateDetailSheet.tsx` | Vervangen door DetailPanel + CandidateDetailContent |

---

## Technische details

### DetailPanel component (`src/components/polar/DetailPanel.tsx`)

Herbruikbaar component met responsive gedrag:

```text
Props:
- open: boolean
- onClose: () => void
- title?: string
- children: React.ReactNode
- width?: string (default "w-[460px]")
```

Gebruikt bestaande `useIsMobile()` hook uit `src/hooks/use-mobile.tsx` (breakpoint 768px). Voor de desktop/tablet split (1024px), een inline check met `useMediaQuery` pattern direct in het component (geen aparte hook nodig -- hergebruik het patroon uit `use-mobile.tsx`).

Gedrag:
- Desktop (>=1024px): Render inline div met `border-l`, `flex-shrink-0`, slide-in animatie. Geen overlay.
- Tablet/mobiel (<1024px): Render bestaande `Sheet`/`SheetContent` als fallback.

Het component rendert ALLEEN het panel zelf (header met close-knop + scrollable content area). De parent moet de flex container leveren.

### CandidateDetailContent (`src/components/onboarding/CandidateDetailContent.tsx`)

Exacte content uit `CandidateDetailSheet.tsx` minus de Sheet wrapper:
- CandidateHeader
- NestoTabs (Taken, Info, Tijdlijn)
- Tab content (PhaseTaskList, CandidateInfo, CandidateTimeline, EvaluationForm)
- CandidateActions (sticky footer)
- Alle hooks (useAuth, useOnboardingTasks, useCompleteTask, etc.)

Props: `{ candidateId: string; onClose: () => void }`

### OnboardingPage layout wijziging

Huidige structuur (`div.p-6.space-y-6` met alles erin) wordt:

```text
<div className="flex flex-col h-full">
  <div className="p-6 pb-0 space-y-4">
    <PageHeader ... />
    <StatusFilterPills ... />
  </div>

  <div className="flex flex-1 min-h-0 px-6 pb-6">
    {/* Board */}
    <div className="flex-1 min-w-0 overflow-x-auto">
      <PipelineBoard ... selectedCandidateId={selectedCandidateId} />
    </div>

    {/* Detail panel */}
    <DetailPanel
      open={!!selectedCandidateId}
      onClose={() => setSelectedCandidateId(null)}
      title={selectedCandidate naam}
    >
      <CandidateDetailContent
        candidateId={selectedCandidateId!}
        onClose={() => setSelectedCandidateId(null)}
      />
    </DetailPanel>
  </div>

  <AddCandidateModal ... />
</div>
```

Plus `useEffect` voor Escape key handler.

### CandidateCard -- isSelected prop

```text
interface CandidateCardProps {
  candidate: { ... };
  onClick?: () => void;
  isSelected?: boolean;   // NIEUW
}
```

Styling: `isSelected ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"`

### Prop doorgeefketen

```text
OnboardingPage (selectedCandidateId)
  -> PipelineBoard (selectedCandidateId prop)
    -> PhaseColumn (selectedCandidateId prop)
      -> CandidateCard (isSelected = candidate.id === selectedCandidateId)
```

### Animatie

Panel openen: `animate-in slide-in-from-right-4 duration-200` (bestaande Tailwind animate utilities)
Board krimpen: `transition-all duration-200` op de flex-1 container

