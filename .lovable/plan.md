

# Toast Redesign — 2 Enterprise Varianten met Test Pagina

## Huidige situatie

De toast gebruikt een 3px gekleurde left-border met gekleurde title-tekst. Dit geeft een "dashboard admin panel" gevoel, niet het subtiele Linear/Stripe/Notion niveau dat Nesto Polar nastreeft.

## Twee nieuwe varianten

### Variant A: "Minimal Icon" (Linear-stijl)

Subtiele toast met een klein icoon links (CheckCircle, XCircle, etc.) en neutrale tekst. Geen gekleurde borders, geen gekleurde titels. Het icoon is het enige kleur-accent.

- Achtergrond: `bg-card`
- Shadow: subtiel enterprise shadow
- Icoon: klein (16px), kleur per type (groen/rood/oranje/teal)
- Titel: `text-foreground`, gewoon 14px medium
- Beschrijving: `text-muted-foreground`, 13px
- Border: 1px `border-border/60` — geen left-border accent
- Radius: 10px
- Compact: minder padding (12px 14px)

### Variant B: "Pill Snackbar" (Vercel/Sonner-stijl)

Ultra-compact, donkere pill die onderaan verschijnt. Geen card-styling, maar een floating dark chip met wit icoon en witte tekst. Heel subtiel, verdwijnt snel.

- Achtergrond: `hsl(var(--foreground))` (donker in light mode, licht in dark mode)
- Tekst: `hsl(var(--background))` (inverse)
- Icoon: 14px, wit/licht
- Geen border, geen description — alleen titel
- Radius: 999px (pill)
- Shadow: `0 8px 24px rgba(0,0,0,0.15)`
- Compact: `py-2.5 px-4`
- Positie: bottom-center

## Test pagina

Een nieuwe route `/test-toasts` met een simpele pagina met:
- Heading: "Toast Varianten"
- 2 secties (Variant A en Variant B), elk met 4 buttons (Success, Error, Warning, Info)
- Elke button triggert de bijbehorende toast-variant
- De varianten gebruiken `toast.custom()` van Sonner om custom JSX te renderen

Dit wordt een standalone test-pagina — geen wijzigingen aan de bestaande toast config. Na keuze wordt de gekozen variant de standaard en wordt de test-pagina verwijderd.

## Wijzigingen

| Bestand | Actie |
|---------|-------|
| `src/pages/TestToasts.tsx` | Nieuw — test pagina met 2 varianten en trigger-buttons |
| `src/App.tsx` | Route `/test-toasts` toevoegen (binnen protected routes) |

Geen CSS-wijzigingen nodig — de custom toasts gebruiken inline Tailwind classes via `toast.custom()`. Na goedkeuring van een variant wordt die permanent in de CSS/config verwerkt.

