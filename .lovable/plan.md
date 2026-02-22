
# Fix: Preview popup niet zichtbaar in nieuw tabblad + live preview check

## Probleem

De drie marketing popup edge functions (`marketing-popup-config`, `marketing-popup-widget`, `marketing-popup-preview`) retourneren allemaal een 404-fout. Dit betekent dat ze niet gedeployed zijn. De vorige deployment is kennelijk niet geslaagd.

### Gevolg voor "openen in nieuw tabblad"
Wanneer je op "Preview openen in nieuw tabblad" klikt, opent de React-component `PopupPreviewDemo` in een los tabblad. Omdat het niet in een iframe draait (`isInIframe = false`), wordt de eigen shadow DOM/postMessage-logica overgeslagen en vertrouwt de pagina volledig op het widget-script van de edge function. Dat script wordt geladen via `marketing-popup-widget`, maar die retourneert 404 — dus er verschijnt geen popup.

### Live preview in iframe
De live preview in de editor werkt via postMessage en is niet afhankelijk van de edge functions. Dit zou al correct moeten werken na de vorige fix. Ik zal dit ook visueel controleren.

## Oplossing

### Stap 1: Edge functions deployen
De drie functies opnieuw deployen:
- `marketing-popup-config`
- `marketing-popup-widget`  
- `marketing-popup-preview`

### Stap 2: Verifieer deployment
Na deployment testen of de config-endpoint correct data retourneert voor de locatie `de-proeverij`.

### Stap 3: Visueel testen
- De popup-editor openen, headline/beschrijving wijzigen, en controleren of de live preview iframe direct meeverandert
- De preview in een nieuw tabblad openen en controleren of de popup verschijnt

## Bestanden

Geen codewijzigingen nodig — alleen deployment van bestaande edge functions.
