

# Stap 2: Onboarding Pipeline Board UI

Bouw een kanban-achtig pipeline board op `/onboarding` waar hiring managers kandidaten per fase kunnen bekijken en toevoegen.

---

## Overzicht

Een nieuwe pagina met horizontaal scrollbare kolommen (1 per fase), kandidaatkaarten met fase-duur indicatoren, statusfilters, en een modal om nieuwe kandidaten toe te voegen. Alles gebouwd met bestaande Nesto Polar componenten.

---

## Wat wordt gebouwd

### Navigatie en routing
- Nieuwe route `/onboarding` in `App.tsx` (binnen ProtectedRoute)
- "Onboarding" menu-item in sidebar onder de sectie "BEHEER", met `UserPlus` icoon
- Route map en path-matching uitbreiden in `src/lib/navigation.ts`

### Data hooks (3 stuks)
- **`useOnboardingPhases`** -- haalt actieve fasen op, gesorteerd op sort_order
- **`useOnboardingCandidates`** -- haalt kandidaten op met hun huidige fase-info (join op onboarding_phases)
- **`useCreateCandidate`** -- mutation met toast feedback, invalidates query cache

### Componenten (7 stuks)

| Component | Beschrijving |
|-----------|-------------|
| `OnboardingPage` | Hoofdpagina met PageHeader, statusfilter, en PipelineBoard |
| `PipelineBoard` | Horizontaal scrollbaar grid van PhaseColumns |
| `PhaseColumn` | Eén kolom: fase-header met count badge + lijst CandidateCards |
| `CandidateCard` | Klikbare kaart met naam, functie-interesse, en fase-duur badge |
| `PhaseDurationBadge` | Kleur-gecodeerde badge (groen/oranje/rood) op basis van tijd in fase |
| `StatusFilterPills` | Filter-knoppen: Actief, Afgerond, Afgewezen, Alle |
| `AddCandidateModal` | NestoModal met formulier voor nieuwe kandidaat |

### Statusfilter logica

| Filter | Conditie |
|--------|----------|
| Actief (default) | `status === 'active'` |
| Afgerond | `status === 'hired'` |
| Afgewezen | `status in ('rejected', 'withdrawn', 'no_response', 'expired')` |
| Alle | Geen filter |

---

## Bestandsstructuur

```text
src/
  pages/
    OnboardingPage.tsx              (nieuw)
  hooks/
    useOnboardingPhases.ts          (nieuw)
    useOnboardingCandidates.ts      (nieuw)
    useCreateCandidate.ts           (nieuw)
  components/
    onboarding/
      PipelineBoard.tsx             (nieuw)
      PhaseColumn.tsx               (nieuw)
      CandidateCard.tsx             (nieuw)
      PhaseDurationBadge.tsx        (nieuw)
      StatusFilterPills.tsx         (nieuw)
      AddCandidateModal.tsx         (nieuw)
      index.ts                      (nieuw - barrel exports)
```

---

## Technische details

### Navigatie-aanpassingen

**`src/lib/navigation.ts`**:
- Route `'onboarding': '/onboarding'` toevoegen aan ROUTE_MAP
- Menu-item toevoegen in menuItems array in sectie "BEHEER", boven "Finance":
  ```text
  { id: 'onboarding', label: 'Onboarding', icon: UserPlus, path: '/onboarding', section: 'BEHEER' }
  ```

**`src/App.tsx`**:
- Import `OnboardingPage` en voeg route toe: `<Route path="/onboarding" element={<OnboardingPage />} />`

### Hooks

Alle hooks gebruiken `useUserContext()` om `currentLocation?.id` als `locationId` te verkrijgen. Query keys volgen het bestaande patroon: `['onboarding-phases', locationId]`, `['onboarding-candidates', locationId]`.

`useOnboardingCandidates` doet een join via Supabase: `.select('*, current_phase:onboarding_phases!current_phase_id(id, name, sort_order)')`.

`useCreateCandidate` invalideert `['onboarding-candidates']` na succes en toont een Sonner toast.

### OnboardingPage layout

```text
+-------------------------------------------+
| PageHeader: "Onboarding"    [+ Kandidaat] |
+-------------------------------------------+
| [Actief] [Afgerond] [Afgewezen] [Alle]    |
+-------------------------------------------+
| Fase 1   | Fase 2   | Fase 3   | ...     |
| 3        | 1        | 0        |         |
|----------|----------|----------|---------|
| Kaart    | Kaart    | Geen     |         |
| Kaart    |          | kand.    |         |
| Kaart    |          |          |         |
+-------------------------------------------+
```

### PipelineBoard styling
- Container: `flex gap-4 overflow-x-auto pb-4` met snap scroll op mobiel
- Kolommen: `min-w-[280px] w-[300px] flex-shrink-0 bg-secondary/30 rounded-lg p-3`
- Kolom header: fase naam (text-sm font-medium) + NestoBadge met count
- Lege kolom: muted tekst "Geen kandidaten"

### CandidateCard styling
- `bg-card border border-border/50 rounded-lg p-3 cursor-pointer hover:border-primary/30 transition-colors`
- Naam: `text-sm font-medium`
- Functie: `text-xs text-muted-foreground`
- PhaseDurationBadge rechtsonder

### PhaseDurationBadge
- Berekent uren sinds `updated_at` van de kandidaat
- Groen (< 24u), Oranje (24-48u), Rood (> 48u)
- Kleine NestoBadge variant met kleur-klassen

### AddCandidateModal velden
- Voornaam (verplicht) -- NestoInput
- Achternaam (verplicht) -- NestoInput
- E-mailadres (verplicht, type="email") -- NestoInput
- Telefoon (optioneel) -- NestoInput
- Functie-interesse (optioneel) -- NestoSelect: Bediening, Keuken, Bar, Afwas, Management, Anders
- Bron (optioneel) -- NestoSelect: Website, Indeed, Referral, Walk-in, Social media, Anders
- Notities (optioneel) -- Textarea

Footer: "Annuleren" (secondary) + "Toevoegen" (primary)

### Responsive gedrag
- Desktop (>1024px): alle kolommen zichtbaar, horizontaal scroll als nodig
- Tablet (768-1024px): kolommen `min-w-[240px]`
- Mobiel (<768px): volledige breedte kolommen met `scroll-snap-type: x mandatory`

### Wat NIET in deze stap
- Geen drag-and-drop (komt later)
- Klik op kandidaatkaart doet niets zichtbaars (detail panel komt in stap 3)
- Geen permission/entitlement gating op de sidebar (sidebar toont het item altijd, maar de pagina zelf is binnen ProtectedRoute)

