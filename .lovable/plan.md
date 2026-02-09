
# Email Template Cards: Enterprise styling

## Huidige situatie
De cards zijn functioneel maar missen de gepolijste, professionele uitstraling van de rest van het design systeem. Specifiek:
- Platte header zonder visuele scheiding
- Variable chips zijn basic
- Preview toggle is een kale underline link
- Preview sectie heeft weinig structuur
- Template key badge is erg subtiel

## Wijzigingen in `src/components/onboarding/settings/EmailTemplateEditor.tsx`

### 1. Header sectie verfijnen
- Voeg een `border-b border-border/50 pb-3` toe aan de header voor een duidelijke scheiding tussen header en formulier
- Geef de template key badge een subtielere, meer enterprise stijl: `bg-secondary text-muted-foreground border border-border/40`

### 2. Formulier groepering
- Wrap de "Onderwerp" en "Body" velden in een `bg-secondary/50 rounded-card p-4 space-y-3` blok (het Enterprise Form Grouping patroon dat al gebruikt wordt in de shift modals)

### 3. Variable chips upgraden
- Verfijnde styling: `bg-secondary border border-border/40 text-foreground hover:border-primary/50 hover:bg-primary/5` voor een subtielere, professionelere look
- Voeg een kleine `Code` icoon toe aan het "Variabelen:" label

### 4. Preview toggle als inline button
- Vervang de underline link door een ghost-achtige inline button: `text-xs px-2 py-1 rounded-button bg-secondary/80 hover:bg-secondary border border-border/40 transition-colors`
- Voeg een `ChevronDown`/`ChevronUp` icoon toe voor visuele feedback

### 5. Preview sectie opwaarderen
- Gebruik `bg-secondary/50 rounded-card p-4 border border-border/40` voor consistentie met het form grouping patroon
- Voeg subtiele labels toe met `text-[11px] uppercase tracking-wider font-medium text-muted-foreground` voor "Onderwerp" en "Body"

## Resultaat
Elke template card krijgt een gestructureerd, professioneel gevoel met duidelijke visuele hierarchie -- consistent met hoe Stripe of Linear hun configuratiepanelen vormgeven.
