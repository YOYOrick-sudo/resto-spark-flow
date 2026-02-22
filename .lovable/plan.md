

# Fix: Preview popup niet zichtbaar in nieuw tabblad

## Probleem

Bij het openen van de preview in een nieuw tabblad verschijnt de popup niet. Na onderzoek zijn er twee oorzaken gevonden:

### Oorzaak 1: Edge functions niet gedeployed
De `marketing-popup-config` en `marketing-popup-widget` edge functions retourneren een 404-fout. Het widget-script kan daardoor de configuratie niet ophalen en de popup niet renderen. Deze functies moeten opnieuw gedeployed worden.

### Oorzaak 2: Dubbele shadow DOM conflicten
De `PopupPreviewDemo` component maakt een eigen shadow host aan (`nesto-popup-preview-host`) voor postMessage-updates, terwijl het widget-script ook een eigen shadow host aanmaakt (`nesto-popup-host`). Bij het openen in een nieuw tabblad is er geen parent iframe die postMessage stuurt, dus de eigen shadow host is overbodig en kan conflicteren.

## Oplossing

### Stap 1: Edge functions deployen
Deploy `marketing-popup-config` en `marketing-popup-widget` zodat ze weer bereikbaar zijn.

### Stap 2: PopupPreviewDemo robuuster maken
In `src/pages/PopupPreviewDemo.tsx`:
- De eigen shadow host (`nesto-popup-preview-host`) alleen aanmaken als de pagina in een iframe draait (d.w.z. `window.parent !== window`). In een nieuw tabblad is er geen parent en dus geen postMessage-updates.
- Dit voorkomt conflicten met het widget-script dat zijn eigen shadow DOM beheert.

Concreet:
- Wrap de shadow host useEffect en de postMessage listener in een check: `if (window.parent !== window)` (alleen actief in iframe-modus)
- In een nieuw tabblad doet alleen het widget-script het werk — geen dubbele rendering

### Stap 3: Fallback bij widget-laadfouten
Voeg een `onerror` handler toe aan het script-element zodat als het widget-script niet laadt, er een foutmelding in de console verschijnt in plaats van een stille failure.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/marketing-popup-config/index.ts` | Deployen |
| `supabase/functions/marketing-popup-widget/index.ts` | Deployen |
| `src/pages/PopupPreviewDemo.tsx` | Shadow host + postMessage alleen in iframe-modus; script error handling |

