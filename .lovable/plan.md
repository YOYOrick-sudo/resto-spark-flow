

# Sessie 4.3 -- Mobile Responsive + Marketing Onboarding Flow

## Samenvatting

Twee onderdelen: (1) Responsive Tailwind fixes voor alle marketing pagina's, (2) onboarding wizard voor nieuwe marketing gebruikers. Geen database migratie nodig.

---

## Deel 1: Mobile Responsive Fixes

Alle wijzigingen zijn Tailwind utility classes. Geen nieuwe componenten, geen CSS.

### 1.1 MarketingDashboard.tsx

- KPI grid (regel 92): al `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` -- geen wijziging
- Campagne tabel (regel 250-255): wrap `NestoTable` in `<div className="overflow-x-auto">` -- NestoCard heeft geen `overflow-hidden` dus dit werkt
- Activity timeline items (regel 272): al responsive

### 1.2 WeekplanCard.tsx

- Header (regel 64): wijzig naar `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`
- Action buttons (regel 101): wijzig naar `flex flex-col sm:flex-row items-stretch sm:items-center gap-2`

### 1.3 BrandIntelligenceCard.tsx

- Stage labels (regel 90-94): voeg `text-[10px] sm:text-xs` toe i.p.v. alleen `text-xs`

### 1.4 ContentIdeasSection.tsx

- Idee items (regel 60-96): al verticaal gestapeld met flex, werkt op mobiel
- "Maak post" button: al `shrink-0` -- geen wijziging nodig

### 1.5 SocialPostCreatorPage.tsx

- PageHeader actions (regel 340): wijzig naar `flex flex-col sm:flex-row gap-2`
- Platform checkboxes: voeg `flex-wrap` toe als dat ontbreekt
- Main layout (regel 372): preview panel is al `hidden lg:block` -- goed

### 1.6 ContentCalendarPage.tsx

- CalendarSidebar (regel 106): wijzig naar `<div className="hidden lg:block"><CalendarSidebar .../></div>` -- sidebar verborgen op mobiel, DayPanel (Sheet) blijft beschikbaar bij klik
- Header actions (regel 33): voeg `flex-wrap` toe
- View toggle + month nav: wrap in `flex flex-wrap gap-2`

### 1.7 ReviewsPage.tsx

- Stats grid (regel 212): al `grid-cols-2 lg:grid-cols-4` -- goed
- Filters (regel 230): al `flex flex-wrap gap-3` -- goed
- Detail Sheet (regel 278): `sm:max-w-lg` is al standaard SheetContent full-width op mobiel -- goed

### 1.8 SocialPostsPage.tsx

- Tabel (regel 284): wrap in `<div className="overflow-x-auto">`
- A/B comparison Sheet: voeg `w-full sm:max-w-lg` toe

### 1.9 CampaignBuilderPage.tsx

- Heeft al "Desktop vereist" op mobiel -- geen wijziging

### 1.10 AnalyticsPage.tsx

- Tab bar (regel 26): wijzig naar `flex gap-4 sm:gap-6 overflow-x-auto` voor horizontale scroll op mobiel

### 1.11 CampaignesPage / ContactsPage / SegmentsPage

- CampaignesPage: tabel is card-based layout, al responsive
- ContactsPage: NestoTable -- wrap in `overflow-x-auto`
- SegmentsPage: card-based layout, al responsive

---

## Deel 2: Marketing Onboarding Flow

### 2.1 Hook: useMarketingOnboardingStatus

**`src/hooks/useMarketingOnboarding.ts` (nieuw)**

- Hergebruikt `useMarketingBrandKit()` intern
- Return: `{ needsOnboarding: boolean, isLoading: boolean }`
- Logic: `needsOnboarding = !data || !data.tone_of_voice`

### 2.2 MarketingOnboardingWizard

**`src/components/marketing/onboarding/MarketingOnboardingWizard.tsx` (nieuw)**

Full-page overlay (`fixed inset-0 z-50 bg-background`):

**Stap 1 -- Welkom**
- Titel: "Marketing instellen"
- Beschrijving: "In 3 stappen is je marketing klaar. De AI leert je stijl en helpt je groeien."
- NestoButton "Start"

**Stap 2 -- Brand Kit Basis**
- Tone of voice: NestoSelect met opties (professioneel, vriendelijk, casual, speels)
- Tone beschrijving: Textarea (optioneel)
- Primary color: NestoInput type="color"
- Logo upload: placeholder tekst
- "Volgende" knop -- slaat op via `useUpdateMarketingBrandKit`

**Stap 3 -- Social Accounts (optioneel)**
- Render bestaande `SocialAccountsTab` component
- "Overslaan" link + "Volgende" knop
- **Instagram detectie**: De wizard draait een eigen `useMarketingSocialAccounts()` call. Een `useEffect` watched `accountsWithStatus` -- wanneer een Instagram account verschijnt met `status === 'active'`, triggert de wizard `useInstagramOnboarding().mutate({ account_id })`. Dit werkt omdat `SocialAccountsTab` na koppeling de query invalidate (via `useSocialAccountMutations`), waardoor de wizard's eigen query automatisch refetcht.

**Stap 4 -- Klaar**
- Samenvatting van ingestelde opties
- Als Instagram gekoppeld: "We importeren je posts en leren je stijl."
- "Ga naar Dashboard" knop

### 2.3 MarketingDashboard.tsx edit

- Import `useMarketingOnboardingStatus` en `MarketingOnboardingWizard`
- Bovenaan render: als `needsOnboarding && !isLoading` -> render wizard i.p.v. dashboard
- Wizard is niet blokkerend: operator kan via sidebar naar andere pagina's

### 2.4 Instagram detectie -- technisch detail

Het probleem: `SocialAccountsTab` is een extern component zonder callback prop. De wizard kan niet weten wanneer een account wordt gekoppeld.

De oplossing: De wizard draait zijn eigen `useMarketingSocialAccounts()` hook. Wanneer `SocialAccountsTab` een account koppelt/ontkoppelt, invalidate `useSocialAccountMutations` de query key `['marketing-social-accounts', locationId]`. Omdat beide hooks dezelfde query key gebruiken, refetcht React Query automatisch de data in de wizard. Een `useEffect` met dependency op `accountsWithStatus` detecteert de change en triggert `useInstagramOnboarding`:

```text
const prevInstagramRef = useRef(false);
useEffect(() => {
  const ig = accountsWithStatus.find(a => a.platform === 'instagram');
  if (ig?.status === 'active' && !prevInstagramRef.current) {
    onboardInstagram.mutate({ account_id: ig.account!.account_id! });
  }
  prevInstagramRef.current = ig?.status === 'active';
}, [accountsWithStatus]);
```

Dit voorkomt dat de import opnieuw triggert bij re-renders (ref tracked vorige state).

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `src/pages/marketing/MarketingDashboard.tsx` | Edit: onboarding check + table overflow-x-auto |
| `src/components/marketing/dashboard/WeekplanCard.tsx` | Edit: responsive header + buttons |
| `src/components/marketing/dashboard/BrandIntelligenceCard.tsx` | Edit: responsive label sizes |
| `src/pages/marketing/SocialPostCreatorPage.tsx` | Edit: responsive header actions |
| `src/pages/marketing/ContentCalendarPage.tsx` | Edit: sidebar hidden on mobile, header wrap |
| `src/pages/marketing/SocialPostsPage.tsx` | Edit: table overflow + Sheet responsive |
| `src/pages/marketing/ContactsPage.tsx` | Edit: table overflow |
| `src/pages/analytics/AnalyticsPage.tsx` | Edit: tab bar overflow |
| `src/hooks/useMarketingOnboarding.ts` | Nieuw |
| `src/components/marketing/onboarding/MarketingOnboardingWizard.tsx` | Nieuw |

## Geen database migratie nodig

Onboarding status wordt bepaald door bestaand `marketing_brand_kit` record + `tone_of_voice` veld. De `useUpdateMarketingBrandKit` hook doet een upsert.

## Technische details

### NestoCard en overflow
NestoCard heeft geen `overflow-hidden` in zijn styling (bevestigd in broncode). `overflow-x-auto` op een child wrapper werkt correct.

### CalendarSidebar op mobiel
Wordt `hidden lg:block`. Op mobiel is de sidebar niet zichtbaar maar de DayPanel (Sheet) is beschikbaar bij klik op een dag in de CalendarGrid. Dit is voldoende voor mobiel gebruik.

### Wizard is niet blokkerend
De wizard vervangt het dashboard component maar de sidebar navigatie blijft beschikbaar. Operator kan altijd naar `/marketing/instellingen` om handmatig in te stellen.

### Instagram onboarding detectie
Gebruikt `useRef` + `useEffect` pattern op de gedeelde React Query cache. Geen polling nodig -- React Query invalidation doet het werk. De ref voorkomt dubbele triggers bij re-renders.

