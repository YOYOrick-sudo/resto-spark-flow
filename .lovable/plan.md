

# Redesign: Widget Reserveerknop in Nesto Polar stijl

## Probleem

De huidige floating button heeft een generieke SaaS-look: zware gradient, dikke schaduw, overdreven border-radius en een bouncy animatie. Dit past niet bij de Nesto Polar design language die gebaseerd is op Linear/Stripe: strak, minimaal, typografie-gedreven.

## Nieuw ontwerp

Een knop die past bij het Nesto-merk: clean, confident, geen visuele ruis.

```text
Huidig                          Nieuw (Nesto Polar)
┌──────────────────────┐        ┌──────────────────────┐
│ ██████████████████   │        │                      │
│ █ 📅  Reserveer  █   │        │    Reserveer  →      │
│ ██████████████████   │        │                      │
│ gradient + heavy     │        │ solid teal, 10px     │
│ shadow + 14px radius │        │ radius, subtle       │
│ + bounce animation   │        │ shadow, smooth fade  │
└──────────────────────┘        └──────────────────────┘
```

### Visuele wijzigingen

| Eigenschap | Oud | Nieuw |
|---|---|---|
| **Achtergrond** | `linear-gradient(180deg, color, darken)` | Solid `color` (flat, geen gradient) |
| **Border radius** | `14px` | `10px` (past bij Nesto card radius) |
| **Schaduw (rust)** | 3-layer heavy shadow met gekleurde glow | `0 1px 3px rgba(0,0,0,0.08), 0 4px 14px rgba(0,0,0,0.10)` |
| **Schaduw (hover)** | Nog zwaardere gekleurde glow | `0 2px 6px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.14)` |
| **Inset border** | `inset 0 0 0 1px rgba(255,255,255,0.15)` | Verwijderd |
| **Icoon** | Kalender SVG (links) | Verwijderd - alleen tekst |
| **Padding** | `16px 28px` (desktop) / `14px 22px` (mobile) | `12px 24px` (desktop) / `12px 20px` (mobile) |
| **Font size** | `15px` (desktop) / `13px` (mobile) | `14px` (desktop) / `13px` (mobile) |
| **Letter spacing** | `0.03em` | `0.01em` (subtieler) |
| **Entrance animatie** | Bounce met overshoot (`scale(1.01)`) | Smooth fade-up zonder bounce |
| **Hover** | `brightness(1.06)` + `translateY(-3px)` | `translateY(-1px)` + lichtere schaduw |
| **Press** | `scale(0.98)` + `brightness(0.96)` | `translateY(0)` + `scale(0.98)` |
| **Pulse dot** | Groen pulserende dot | Verwijderd (te schreeuwerig) - vervangen door subtiele ring-pulse als `data-pulse="true"` |

### Mobiel

| Eigenschap | Oud | Nieuw |
|---|---|---|
| **Positie** | `left:50%` gecentreerd | Rechtsonder (`right:20px, bottom:20px`) - consistent met desktop |
| **Breedte** | Automatisch, gecentreerd | Automatisch, rechts uitgelijnd |

## Technische wijzigingen

### Bestand: `public/widget.js`

1. **Button styling** (regels ~195-230): Gradient vervangen door solid achtergrond, radius naar 10px, schaduwen vereenvoudigen, icoon verwijderen, padding/font verkleinen
2. **Hover/press handlers** (regels ~232-265): Subtielere hover (translateY -1px), press behouden maar zonder brightness filter
3. **Entrance animatie** (keyframes, regels ~101-108): `nestoButtonEntrance` aanpassen: geen bounce, alleen smooth opacity + translateY
4. **Pulse** (regels ~270-280): Groene dot vervangen door subtiele box-shadow pulse op de knop zelf
5. **Mobiel** (regels ~210-215): Positie van centered naar rechtsonder

Geen andere bestanden worden aangepast.
