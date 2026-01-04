# Toast Notificaties - Nesto Polar

## Overzicht
Toasts zijn korte, niet-blokkerende meldingen die rechtsonder verschijnen.

## Wanneer WEL Toasts Gebruiken
- Expliciete acties (button click) → "Area aangemaakt"
- Errors en waarschuwingen → "Fout bij opslaan"
- Destructieve acties bevestigen → "Tafel gearchiveerd"
- Belangrijke status updates → "Uitnodiging verzonden"

## Wanneer GEEN Toasts
- **Autosave** → gebruik inline indicator ("Opgeslagen")
- Form validatie → gebruik inline errors onder velden
- Loading states → gebruik skeleton/spinner
- Elke keystroke of change event

## Varianten & Kleuren

| Variant | Left Border | Wanneer |
|---------|-------------|---------|
| `success` | Groen (#22C55E) | Actie geslaagd |
| `error` | Rood (#EF4444) | Fout opgetreden |
| `warning` | Oranje (#F97316) | Let op, maar geen error |
| `info` | Teal (primary) | Neutrale info |

## Gebruik in Code

```tsx
import { toast } from "sonner";

// Success - expliciete actie
toast.success("Area aangemaakt");

// Error - altijd tonen
toast.error("Fout bij opslaan: " + error.message);

// Warning
toast.warning("Wijzigingen niet opgeslagen");

// Info
toast.info("Nieuwe versie beschikbaar");
```

## Styling Specs
- Positie: bottom-right
- Offset: 24px van edges
- Gap tussen toasts: 12px
- Border radius: 12px
- Left border: 3px solid (variant kleur)
- Animatie: slide-in van rechts (0.2s ease-out)
- Duration: 4000ms (4 seconden)
- Min width: 320px
- Max width: 420px

## Configuratie
De toast configuratie staat in `src/components/ui/sonner.tsx`.
Styling staat in `src/index.css` onder `.nesto-toast` classes.
