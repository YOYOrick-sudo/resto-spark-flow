

# Back-navigatie audit: alle pagina's

## Status quo

Pagina's die al het `← Parent` patroon gebruiken (correct):
- `KaartbeheerDetail.tsx` — `← Kaartbeheer` ✅
- `BereikDetailPage.tsx` — `← Analytics` ✅
- `ReviewsDetailPage.tsx` — `← Analytics` ✅
- `WasteDetailPage.tsx` — `← Analytics` ✅

## Nog aan te passen (3 pagina's + 1 component)

| Bestand | Huidig | Wordt |
|---|---|---|
| `CampaignBuilderPage.tsx` | `ArrowLeft` + "Terug" ghost button (2x) | `← Marketing` link bovenaan |
| `SocialPostCreatorPage.tsx` | `ArrowLeft` + "Terug" in PageHeader actions | `← Marketing` link boven PageHeader |
| `OnboardingDetail.tsx` | Via `DetailPageLayout` → "Terug naar pipeline" | `← Onboarding` (label update) |
| `DetailPageLayout.tsx` | `backLabel` default "Terug naar overzicht" | Default wijzigen naar korte parent-naam, `min-h-[44px]` toevoegen |

## Niet aanpassen (correct uitgezonderd)

- **Settings pagina's** (`SettingsDetailLayout`, `SettingsPageLayout`): gebruiken breadcrumbs — dat is correct voor 2+ niveaus diep
- **BookingWidget**: eigen widget-context, geen app-navigatie
- **WaitlistForm**: booking flow, eigen context
- **MepTaken / ContentCalendar**: `ChevronLeft` wordt daar als kalender-pijl gebruikt (vorige maand/dag), niet als navigatie
- **Carousel**: UI control, geen navigatie

## Wijzigingen

### 1. `DetailPageLayout.tsx`
- `min-h-[44px]` toevoegen aan de back-link
- Default `backLabel` blijft configurable (wordt per pagina gezet)

### 2. `OnboardingDetail.tsx`  
- `backLabel` wijzigen van `"Terug naar pipeline"` naar `"Onboarding"`

### 3. `CampaignBuilderPage.tsx`
- Beide `ArrowLeft` + "Terug" buttons vervangen door `← Marketing` link (zelfde styling als andere pagina's)
- Import `ArrowLeft` → `ChevronLeft`, `Link` toevoegen

### 4. `SocialPostCreatorPage.tsx`
- "Terug" button uit PageHeader actions verwijderen
- `← Marketing` link toevoegen boven de PageHeader

## Ontwerpbeslissing (bevestiging)

```text
Detail pages (1 niveau diep):  ← [Parent label]     ChevronLeft + Link
Settings pages (2+ niveaus):   Breadcrumbs           Instellingen > Module > Sectie
Widget/booking flows:           Eigen navigatie        Niet aanpassen
```

