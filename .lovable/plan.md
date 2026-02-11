

# Enterprise Polish — Onboarding Detail Page

## Problemen gevonden

### 1. "CONTACTGEGEVENS" in uppercase
Regel 226 en 245 gebruiken `uppercase tracking-wide` op de sidebar headings. Dit is expliciet verboden in het Nesto Polar design system (sentence case, nooit uppercase).

### 2. Action bar breekt visueel uit
De `CandidateActions` component zit BINNEN de `DetailPageLayout` children, maar gebruikt `sticky bottom-0` met volle breedte. Dit veroorzaakt de donkere strook links — de bar probeert breder te worden dan de content-kolom. De action bar moet visueel aansluiten op de content-breedte.

### 3. Sidebar card styling
De sidebar gebruikt `bg-secondary` met `border border-border/50`. Volgens de Card Shadow regels zou dit `bg-card` moeten zijn met een enterprise shadow (light mode) en `dark:border dark:border-border` fallback, consistent met andere cards in de app.

### 4. Action bar moet buiten DetailPageLayout
De action bar hoort niet als child van `DetailPageLayout` te zitten. Hij moet op pagina-niveau staan, buiten de layout wrapper, zodat hij correct sticky kan zijn aan de onderkant van het viewport.

## Wijzigingen

### Bestand 1: `src/pages/OnboardingDetail.tsx`

**Sidebar headings:** Verwijder `uppercase tracking-wide` van de h3-elementen op regel 226 en 245. Verander naar sentence case: "Contactgegevens" (niet "CONTACTGEGEVENS").

**Sidebar card styling:** Verander `bg-secondary rounded-xl border border-border/50` naar `bg-card rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-border`.

**Action bar positie:** Verplaats `CandidateActions` buiten de `DetailPageLayout` children, direct na de `</DetailPageLayout>` tag, maar nog wel binnen de buitenste `<div className="p-6">`. Zo wordt de sticky bar niet beperkt door de flex-col van DetailPageLayout.

### Bestand 2: `src/components/onboarding/CandidateActions.tsx`

**Breedte beperking:** Voeg `max-w-5xl` toe aan de action bar container zodat hij niet breder wordt dan de content. Verwijder de negatieve margin/padding issues.

**Margin:** Voeg `mt-6` toe zodat er ruimte is tussen content en action bar.

## Overzicht

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/OnboardingDetail.tsx` | Sidebar: sentence case headings, enterprise card shadow. Action bar: verplaats buiten DetailPageLayout |
| `src/components/onboarding/CandidateActions.tsx` | Max-width beperking, margin-top voor spacing |

