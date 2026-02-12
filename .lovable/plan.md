

# Toast V4 — Bottom-up + Nieuw Enterprise Type

## Wat verandert

### Positie: Bottom-up voor beide varianten
Beide varianten verschijnen vanaf de onderkant met een slide-up animatie. Variant A verhuist van bottom-right naar bottom-center, net als Variant B.

### Variant A V4: "Whisper" — nu bottom-center
- Zelfde subtiele styling als V3 maar positie wordt `bottom-center`
- Slide-up entry animatie

### Variant B V4: "Inline Status" — Nieuw type
Weg van de Ghost Bar. Nieuw concept geinspireerd door hoe Stripe en Raycast feedback geven: een ultra-dunne lijn met alleen tekst en een subtiel gekleurd streepje links (2px, niet 3px). Geen icoon, geen shadow bijna. Puur typografie-gedreven.

- Achtergrond: `bg-foreground/[0.03]` — bijna transparant, net zichtbaar
- Border: geen volledige border, alleen een `border-l-2` met variant-kleur (gedempte tint: `border-success/40`)
- Tekst: `text-[13px] font-normal text-foreground/70` — heel gedempt
- Geen icoon — het linker streepje IS de indicator
- Geen beschrijving, geen close button
- Radius: `rounded-lg` (8px)
- Shadow: `shadow-none` of `shadow-[0_1px_4px_rgba(0,0,0,0.03)]`
- Padding: `py-2 px-3` — minimaal
- Positie: `bottom-center`
- Max-width: `300px`
- Auto-dismiss na 3 seconden (korter = subtieler)

Dit is het tegenovergestelde van een "card toast" — het is bijna een inline melding die even verschijnt en weer verdwijnt. Extreem minimalistisch.

## Wijzigingen

| Bestand | Actie |
|---------|-------|
| `src/pages/TestToasts.tsx` | Variant A positie naar bottom-center, Variant B volledig vervangen met "Inline Status" concept |

