
# CreateReservationSheet & WalkInSheet migreren naar PanelShell design

## Probleem
De "Nieuwe reservering" en "Walk-in" popups gebruiken nog de standaard ShadCN Sheet component. Dit ziet er anders uit dan het panel-demo design met:
- Reveal header die verschijnt bij scrollen
- Floating close button
- Vaste footer met actieknoppen
- Rounded card-achtig design met shadow

## Aanpak

### Stap 1: NestoPanel component aanmaken
Een herbruikbaar `NestoPanel` component bouwen op basis van het PanelShell-patroon uit PanelDemo. Dit component wordt de standaard voor alle rechterpanelen.

**Bestand:** `src/components/polar/NestoPanel.tsx`

Kenmerken:
- Desktop (>=1024px): Fixed overlay panel aan de rechterkant, 460px breed, met backdrop
- Mobile (<1024px): Sheet fallback (zoals nu)
- Reveal header: titel verschijnt in de header zodra de in-content titel uit beeld scrollt
- Floating X-button die wisselt met de header X-button
- Optionele vaste footer voor form-mode
- IntersectionObserver voor titel-tracking (exact zoals PanelDemo)

Props:
- `open: boolean`
- `onClose: () => void`
- `title: string`
- `footer?: React.ReactNode`
- `children: (titleRef: React.RefObject<HTMLHeadingElement>) => React.ReactNode`
- `width?: string` (default: `w-[460px]`)

### Stap 2: CreateReservationSheet migreren
**Bestand:** `src/components/reservations/CreateReservationSheet.tsx`

Wijzigingen:
- `Sheet` + `SheetContent` + `SheetHeader` + `SheetTitle` vervangen door `NestoPanel`
- De `StepIndicator` verplaatsen naar boven de in-content titel
- Content via `renderContent={(titleRef) => ...}` met `titleRef` op de h2
- Footer (Terug/Doorgaan/Aanmaken buttons) naar de `footer` prop
- Behoud alle bestaande logica en state management

### Stap 3: WalkInSheet migreren
**Bestand:** `src/components/reservations/CreateReservationSheet.tsx`

Wijzigingen:
- Zelfde Sheet-naar-NestoPanel migratie
- Footer met "Walk-in registreren" button naar `footer` prop
- Titel "Walk-in registreren" als in-content titel met titleRef

### Stap 4: DetailPanel ook migreren (optioneel maar consistent)
Het bestaande `DetailPanel` component (`src/components/polar/DetailPanel.tsx`) mist de reveal header. Dit kan ook naar NestoPanel gemigreerd worden zodat alle panels dezelfde UX hebben.

---

## Technische details

### NestoPanel structuur
```text
+------------------------------------------+
|  [Reveal header: titel + X]  (hidden)    |  <- verschijnt bij scroll
+------------------------------------------+
|  [Floating X button]                     |  <- zichtbaar wanneer titel in view
|                                          |
|  [Scrollable content area]               |
|    - In-content titel (met titleRef)     |
|    - Formulier velden                    |
|    - ...                                 |
|                                          |
+------------------------------------------+
|  [Vaste footer met actieknoppen]         |  <- alleen bij form mode
+------------------------------------------+
```

### Desktop rendering
- Fixed overlay: `fixed top-0 right-0 bottom-0 z-40`
- Backdrop: `bg-black/20` met click-to-close
- Panel: `bg-card border-l border-border/50 shadow-xl rounded-l-2xl`
- Slide-in animatie: `animate-in slide-in-from-right-4`

### Mobile rendering  
- Fallback naar Sheet component (bestaande behavior)
- `side="right"` met `w-full sm:max-w-[460px]`

### Bestanden die wijzigen
1. **Nieuw:** `src/components/polar/NestoPanel.tsx`
2. **Wijzig:** `src/components/reservations/CreateReservationSheet.tsx` (Sheet naar NestoPanel)
3. **Wijzig:** `src/components/polar/index.ts` (export toevoegen)
4. **Optioneel wijzig:** `src/components/polar/DetailPanel.tsx` (kan NestoPanel wrappen)

### Wat niet wijzigt
- Alle form logica, state, hooks en data flows blijven identiek
- De `Reserveringen.tsx` pagina hoeft niet te wijzigen (props blijven hetzelfde)
- Alle validatie, overlap warnings, en submit handlers blijven behouden
