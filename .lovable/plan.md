
## Diagnose tot nu toe

- De foutmelding in de screenshot is de generieke fallback uit `ApplicationStep3Motivation.tsx`:
  - `catch` zet altijd: `Er ging iets mis. Probeer het later opnieuw.`
  - Daardoor zie je in de UI nu niet de echte backend-fout.
- Bug 1 is in code nog niet overal opgelost:
  - `ApplicationStep1Personal` heeft al `text-gray-900`
  - `ApplicationStep2Position` mist dat nog op het startdatum-input
  - `ApplicationStep3Motivation` mist dat nog op de textarea
- De huidige `className="light"` fix werkt niet structureel, want in `src/index.css` bestaan overrides voor `:root` en `.dark`, maar niet voor `.light`. Dus token-based velden kunnen alsnog dark-mode waarden erven.
- De fase-seeding migration staat er nu wel:
  - auto-seed trigger op `locations`
  - `_seed_default_onboarding_phases(...)`
  - `reset_onboarding_phases(...)` gedelegeerd naar dezelfde seed-functie
- `generate_initial_onboarding_tasks()` faalt niet meer op “geen fases”; bij geen fase doet die gewoon `RETURN NEW`.
  - Dat maakt het waarschijnlijk dat de submit-fout nu elders zit.
- In deze read-only modus heb ik geen live submit kunnen reproduceren met echte request/response + function logs. De snapshots bevatten geen `submit-application` request en geen bruikbare console-fout.

## Plan om te fixen

### 1. Publieke form volledig isoleren van design tokens
Ik ga de publieke sollicitatievelden hardcoderen in light mode, conform het guest-widget isolation patroon:
- eigen input/textarea styling met:
  - `bg-white`
  - `text-gray-900`
  - `placeholder:text-gray-400`
  - `border-gray-200`
- geen afhankelijkheid meer van `text-foreground`, `bg-background`, `bg-card` of andere app-tokens op de publieke sollicitatieflow

Concreet:
- `ApplicationStep2Position.tsx` → startdatum input krijgt expliciete tekstkleur
- `ApplicationStep3Motivation.tsx` → textarea krijgt expliciete tekstkleur + placeholderkleur
- indien nodig maak ik een kleine lokale `PublicFormField` / `PublicTextarea` helper zodat alle publieke velden identiek en geïsoleerd zijn

### 2. Echte submit-error zichtbaar maken
Ik ga de submit-flow aanpassen zodat de echte fout niet meer wordt verstopt:
- frontend:
  - response body en function error expliciet loggen
  - bekende error codes blijven netjes vertaald
  - onbekende errors tijdelijk ook debugbaar maken in console
- backend (`submit-application`):
  - extra `console.error` toevoegen rond:
    - settings lookup
    - duplicate check
    - candidate insert
    - audit insert
    - eventuele mail/automation side effects als die elders getriggerd worden

### 3. Live reproduceren en exacte fout ophalen
Na de code-aanpassingen ga ik één echte submit uitvoeren en tegelijk controleren:
- browser network response van `submit-application`
- browser console
- edge function logs van `submit-application`

Ik rapporteer daarna exact:
- request bereikte functie wel/niet
- HTTP status
- response body
- concrete logregel uit backend
- precieze oorzaak

### 4. Gerichte backend-fix op basis van echte fout
Pas nadat de echte fout zichtbaar is, fix ik de backend. Waarschijnlijke categorieën die ik zal verifiëren:
- constraint/FK fout op candidate insert
- trigger-side effect na insert
- duplicaat/rate-limit pad
- downstream automation of bevestigingsmail pad

Ik ga dus niet gokken; ik fix alleen op basis van de echte foutmelding.

## Bestanden die waarschijnlijk aangepast worden

- `src/components/public-application/ApplicationStep2Position.tsx`
- `src/components/public-application/ApplicationStep3Motivation.tsx`
- mogelijk een nieuwe publieke field helper in `src/components/public-application/...`
- `supabase/functions/submit-application/index.ts`

## Verificatie na build

1. Publieke pagina in system dark mode:
- inputs en textarea blijven wit met donkere tekst

2. Echte submit:
- network tab toont request + response
- backend logs tonen concrete logregels
- kandidaat wordt aangemaakt zonder generieke fout

3. Onboarding-resultaat:
- kandidaat komt in fase 1 terecht
- fase-1 task templates worden aangemaakt
- bevestigingsmailflow wordt gecontroleerd als onderdeel van de submit-uitkomst

## Technische noot
De kern van Bug 1 is niet “Tailwind werkt niet”, maar dat de publieke pagina nog deels vertrouwt op globale theme tokens. Voor guest/public surfaces is harde light isolation hier de juiste aanpak.
