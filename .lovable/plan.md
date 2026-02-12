

# Archief-weergave voor afgeronde en afgewezen kandidaten

## Huidige situatie

De StatusFilterPills bestaan al met 4 opties: Actief, Afgerond, Afgewezen, Alle. Maar bij het selecteren van "Afgerond" of "Afgewezen" worden kandidaten nog steeds in het Kanban board getoond. Dit werkt niet goed omdat:

- Hired kandidaten geen actieve fase meer hebben
- Afgewezen kandidaten ook geen logische kolom hebben
- Een pipeline-board is niet geschikt voor het scannen van historische data

## Oplossing

Wanneer de filter op **Afgerond**, **Afgewezen**, of **Alle** staat, toon een **tabel-weergave** in plaats van het Kanban board. Het board wordt alleen getoond bij "Actief".

### Tabel kolommen

| Kolom | Inhoud |
|-------|--------|
| Naam | Voornaam + achternaam |
| E-mail | E-mailadres |
| Status | Badge (Aangenomen / Afgewezen / Ingetrokken / Geen reactie / Verlopen) |
| Laatste fase | De fase waar de kandidaat het laatst in zat |
| Datum | `updated_at` als "relatieve" datum (bijv. "3 dagen geleden") |

De tabel is klikbaar — rij-klik navigeert naar de detail pagina, net als de candidate cards.

## Wijzigingen

### Nieuw bestand: `src/components/onboarding/CandidateArchiveTable.tsx`

Een tabel-component die de niet-actieve kandidaten toont met:
- Kolommen: naam, e-mail, status (NestoBadge), laatste fase, datum
- Klikbare rijen die navigeren naar `/onboarding/:id`
- Lege state wanneer er geen kandidaten zijn
- Gebruik van de standaard `Table` UI components

### Bestand wijzigen: `src/pages/OnboardingPage.tsx`

- Import `CandidateArchiveTable`
- Conditie toevoegen: als `statusFilter === 'active'` toon het `PipelineBoard`, anders toon de `CandidateArchiveTable`
- De tabel krijgt dezelfde `filteredCandidates` data

### Geen database-wijzigingen nodig

De `useOnboardingCandidates` hook haalt al alle kandidaten op inclusief `current_phase` relatie. De `onboarding_phase_logs` tabel bevat historische fase-data, maar voor de MVP volstaat de `current_phase` relatie die al beschikbaar is.

## Technisch overzicht

```text
statusFilter === 'active'
  --> PipelineBoard (kanban, bestaand)

statusFilter === 'hired' | 'rejected' | 'all'
  --> CandidateArchiveTable (tabel, nieuw)
```

| Bestand | Actie |
|---------|-------|
| `src/components/onboarding/CandidateArchiveTable.tsx` | Nieuw — archief tabel component |
| `src/pages/OnboardingPage.tsx` | Wijzigen — conditionele weergave board vs. tabel |
| `src/components/onboarding/index.ts` | Wijzigen — export toevoegen |

