

# Reset naar standaard: onboarding fasen herstellen

## Concept

Een "Herstel standaardinstelling" functie waarmee de gebruiker de volledige onboarding pipeline kan terugzetten naar de door Nesto aanbevolen configuratie (10 fasen, met bijbehorende systeemtaken).

## Enterprise patroon: "Restore defaults" met bevestiging

Geen los knopje ergens in een hoek -- we gebruiken het patroon dat Stripe, Linear en Notion hanteren:

1. **Subtiele link-achtige knop** onderaan de fasen-lijst, naast "Fase toevoegen"
2. **ConfirmDialog** met duidelijke waarschuwing over wat er gebeurt
3. **Geen "undo"** -- de bevestiging IS de bescherming

### Waarom dit patroon?

| Optie | Bezwaar |
|-------|---------|
| Reset-knop bovenaan in PageHeader | Te prominent, suggereert dat het een veelgebruikte actie is |
| Dropdown menu met "Reset" optie | Te verborgen, gebruiker vindt het niet |
| **Link-knop onderaan fasen-lijst** | **Juiste balans: vindbaar maar niet dominant. Stripe doet dit ook** |

## Wat de gebruiker ziet

### Onderaan de Fasen-tab (na "Fase toevoegen")

```text
[--- Fase toevoegen ---]           (bestaande dashed button)

              Standaardinstelling herstellen    (ghost link, RotateCcw icon, muted kleur)
```

### Na klik: ConfirmDialog

```text
+------------------------------------------+
|  (!) Standaardinstelling herstellen       |
|                                           |
|  Dit vervangt alle huidige fasen en       |
|  taken door de aanbevolen Nesto           |
|  configuratie (10 fasen).                 |
|                                           |
|  Bestaande fasen worden verwijderd.       |
|  Lopende kandidaten worden NIET           |
|  beïnvloed.                              |
|                                           |
|           [Annuleren]  [Herstellen]       |
+------------------------------------------+
```

- Variant: `default` (niet destructive -- het is een herstelactie, geen verwijdering)
- Confirm label: "Herstellen"

## Technische aanpak

### 1. Database RPC: `reset_onboarding_phases(p_location_id uuid)`

Een server-side functie die:
1. Alle bestaande fasen voor de locatie op `is_active = false` zet (soft-archive, niet hard delete)
2. De 10 standaard fasen insert met de aanbevolen task_templates (inclusief `is_system: true` en `task_type` velden)
3. Returns: de nieuwe fasen

Waarom een RPC en geen client-side delete+create loop?
- Atomiciteit: alles slaagt of niets
- Snelheid: 1 roundtrip in plaats van 11+
- Veiligheid: de standaard-data leeft server-side, niet in de frontend

### 2. Standaard fase-definitie

Exact de 10 fasen uit de huidige seed-data, maar met de nieuwe velden (`task_type`, `is_system`):

| # | Fase | Systeemtaken |
|---|------|-------------|
| 1 | Aanmelding ontvangen | Ontvangstbevestiging sturen |
| 2 | Screening | Aanvullende vragen sturen |
| 3 | Uitnodiging gesprek | -- |
| 4 | Gesprek | -- |
| 5 | Meeloopdag | -- |
| 6 | Beslissing | -- |
| 7 | Aanbod | Contract versturen |
| 8 | Pre-boarding | Welkomstmail sturen |
| 9 | Eerste werkdag | -- |
| 10 | Inwerkperiode | -- |

### 3. Frontend hook: `useResetOnboardingPhases`

- Roept de RPC aan
- Invalidateert de `onboarding-phases` query
- Toast: "Pipeline hersteld naar standaardinstelling"

### 4. UI in `PhaseConfigSection.tsx`

- Onder de "Fase toevoegen" knop: een ghost-link met `RotateCcw` icon
- onClick opent ConfirmDialog
- Na bevestiging: RPC call, toast, klaar

## Wijzigingen per bestand

| Bestand | Wat |
|---------|-----|
| **Migratie (SQL)** | `reset_onboarding_phases` RPC functie aanmaken |
| **`src/hooks/useResetOnboardingPhases.ts`** | Nieuwe hook die de RPC aanroept |
| **`src/components/onboarding/settings/PhaseConfigSection.tsx`** | Ghost-link + ConfirmDialog toevoegen onderaan |

## Edge cases

- **Actieve kandidaten**: De reset archiveert oude fasen (`is_active = false`) maar raakt geen kandidaten. Kandidaten die in een oude fase zitten behouden hun `current_phase_id` -- dit is bestaand gedrag bij fase-deactivatie.
- **Meerdere resets**: Idempotent. Elke reset archiveert alles en maakt verse fasen aan.
- **Net begonnen (geen fasen)**: Knop werkt ook als er nog geen fasen zijn -- het vult de standaarden in.

