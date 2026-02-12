

# Toast Redesign V2 — Enterprise Upgrade

## Wat er nu mis is

**Variant A:** Ziet er uit als een generieke notificatie-card. De border is te zichtbaar, de shadow te zwak, en het geheel oogt als een standaard component library toast — niet enterprise-level.

**Variant B:** De witte pill op donkere achtergrond ziet er goedkoop uit. Het contrast is te hard, er is geen subtiliteit, en het mist finesse.

## Nieuwe richting

### Variant A V2: "Notion Inline" — Ultra-subtiel

Gebaseerd op hoe Notion en Linear hun toasts doen: bijna onzichtbaar, maar met net genoeg visuele aanwijzing.

- Achtergrond: `bg-popover` (zelfde als dropdown menus, niet `bg-card`)
- Shadow: diepere, gespreide enterprise shadow: `0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)`
- Border: `border border-border/40` — bijna onzichtbaar
- Icoon: 15px, met subtiele achtergrondcirkel (`w-6 h-6 rounded-full bg-success/10` met icoon `text-success`)
- Titel: `text-[13px] font-medium text-foreground` — kleiner, subtieler
- Beschrijving: `text-[12px] text-muted-foreground`
- Radius: `rounded-xl` (12px, passend bij Nesto Polar)
- Padding: `py-2.5 px-3` — compact
- Close button: verborgen, verschijnt alleen op hover van de toast
- Min-width: `280px`, max-width: `380px` — smaller
- Dark mode: `dark:bg-popover dark:border-border/60` met sterkere shadow

### Variant B V2: "Glass Bar" — Frosted floating bar

Een semi-transparante balk met backdrop-blur, gecentreerd onderaan. Denk aan de macOS notificatie-stijl of de Arc browser command bar.

- Achtergrond: `bg-foreground/90` (90% opacity, niet 100% — subtiel)
- Backdrop: `backdrop-blur-xl` voor een frosted glass effect
- Tekst: `text-background` (inverse)
- Icoon: 14px, met een subtiele kleur-tint (niet puur wit maar licht gekleurd: success = `text-emerald-300`, error = `text-rose-300`)
- Radius: `rounded-xl` (12px, niet pill — professioneler)
- Shadow: `0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)` — dieper, meer lagen
- Padding: `py-2.5 px-4`
- Positie: bottom-center
- Min-width: `240px`
- Geen close button — auto-dismiss only (clean)
- Subtiele border: `border border-white/10` voor glass effect

## Wijzigingen

| Bestand | Actie |
|---------|-------|
| `src/pages/TestToasts.tsx` | Beide varianten vervangen met V2 versies |

Geen andere bestanden worden aangepast. Alleen de test pagina wordt bijgewerkt.

