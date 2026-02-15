

# Fix: Onboarding pagina's afstemmen op systeemstandaard

## Het probleem

AppLayout geeft al padding aan alle pagina's. Maar OnboardingPage en OnboardingDetail voegen eigen `p-6` / `px-6` padding toe, waardoor ze smaller lijken en niet uitlijnen met de rest.

**Systeemstandaard** (Dashboard, Reserveringen, Assistent volgen dit al):
- AppLayout geeft `py-6 px-8 lg:py-8 lg:px-12 xl:px-16`
- Pagina's voegen GEEN eigen padding toe
- Root element is `<div className="space-y-...">` of `<div className="flex flex-col h-full">`
- Begint met `<PageHeader>`

## Wijzigingen

### 1. OnboardingPage.tsx

- Verwijder de wrapper `<div className="p-6 pb-0 space-y-4">` rond PageHeader en filters -- PageHeader en StatusFilterPills komen direct in de root div
- Verwijder `px-6 pb-6` van de content area -- wordt gewoon `pt-4`
- Root div blijft `flex flex-col h-full`

### 2. OnboardingDetail.tsx

- Verwijder `p-6` van de drie root containers (loading state regel 126, not-found state regel 136, main content regel 146)
- Content layout blijft ongewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/OnboardingPage.tsx` | Verwijder `p-6 pb-0` wrapper en `px-6 pb-6` van content |
| `src/pages/OnboardingDetail.tsx` | Verwijder `p-6` van 3 root containers |

Geen andere bestanden worden aangepast.

