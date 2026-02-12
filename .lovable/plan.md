

# Toast V8 Fix — Zichtbaarheid & Positionering

## Probleem

Twee issues waardoor de toast niet (goed) zichtbaar is:

1. **Ongeldige offset**: `offset="24px 40px"` is geen geldig Sonner formaat. Sonner accepteert alleen een enkele waarde (getal of string). Dit kan de positionering breken.

2. **Verouderde CSS in `index.css`**: Er staan nog V7-stijlen (`.nesto-toast` met `border-left`, afwijkende font-sizes) die kunnen conflicteren. Omdat `nestoToast` via `toast.custom()` rendert met eigen Tailwind-classes, zijn deze CSS-regels overbodig.

## Oplossing

### 1. Sonner offset fixen (`src/components/ui/sonner.tsx`)

Verander `offset="24px 40px"` terug naar een geldig getal, en gebruik CSS/style om de horizontale positie aan te passen:

```text
offset={24}
style={{ right: '40px' }}
```

Dit plaatst de toast 24px van de onderkant en 40px van de rechterkant.

### 2. Verouderde CSS verwijderen (`src/index.css`)

Verwijder het hele `.nesto-toast` CSS-blok (regels ~329-384). Deze stijlen zijn V7-overblijfselen en worden niet meer gebruikt — V8 rendert volledig via Tailwind-classes in `nestoToast.tsx`.

### 3. Sonner toastOptions opschonen (`src/components/ui/sonner.tsx`)

Verwijder de `classNames` mapping uit `toastOptions` aangezien de CSS-classes niet meer bestaan. Houd `unstyled: true` aan zodat Sonner geen eigen styling toepast op custom toasts.

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/ui/sonner.tsx` | Fix offset, voeg `style` toe, verwijder classNames |
| `src/index.css` | Verwijder `.nesto-toast` CSS-blok (~55 regels) |

