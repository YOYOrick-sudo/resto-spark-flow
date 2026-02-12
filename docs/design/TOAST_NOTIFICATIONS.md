# Toast Notificaties — Nesto Polar V8

## Overzicht
Toasts zijn korte, niet-blokkerende meldingen die rechtsonder verschijnen.
Het project gebruikt **één toast-systeem**: `nestoToast` uit `src/lib/nestoToast.tsx`.

## API

```tsx
import { nestoToast } from "@/lib/nestoToast";

nestoToast.success("Area aangemaakt", "De nieuwe area is beschikbaar");
nestoToast.error("Fout bij opslaan", "Controleer je invoer");
nestoToast.warning("Capaciteit bijna vol", "Nog 2 tafels beschikbaar");
nestoToast.info("Nieuwe versie beschikbaar");
```

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

## Design (V8)
- **Typografie-first**: gekleurde titel als status-indicator, geen dot/border
- Titel: `text-[13.5px] font-medium tracking-tight` in variant-kleur
- Beschrijving: `text-[13px] text-muted-foreground`
- Card: `bg-card rounded-2xl` met subtiele shadow
- Close-button: verschijnt on hover (group-hover)
- Positie: bottom-right, offset 24px, gap 12px
- Duration: 4000ms

## Varianten & Kleuren

| Variant   | Titel kleur       |
|-----------|-------------------|
| `success` | `text-success`    |
| `error`   | `text-error`      |
| `warning` | `text-warning`    |
| `info`    | `text-primary`    |

## Configuratie
- Toast utility: `src/lib/nestoToast.tsx`
- Sonner provider: `src/components/ui/sonner.tsx`
- Styling tokens in `src/index.css`
