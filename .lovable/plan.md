

# Widget Redesign — Premium & Brand-Aware

## Probleem

De widget gebruikt overal hardcoded `bg-gray-800` en `#1a1a1a`. Het restaurant configureert een `brand_color` in de widget settings, maar die wordt nergens toegepast. De widget voelt generiek en niet van het kaliber dat bij Nesto hoort.

## Aanpak: Brand Color Doorvoeren + Premium Polish

### 1. Brand color als primaire kleur overal

De `config.brand_color` (al beschikbaar via BookingContext) wordt de primaire interactiekleur:

- **CTA knoppen**: `brand_color` achtergrond i.p.v. `#1a1a1a`
- **Geselecteerde datumchip**: `brand_color` i.p.v. `bg-gray-800`
- **Geselecteerde tijdslot**: `brand_color` i.p.v. `bg-gray-800`
- **Geselecteerde ticket ring**: `brand_color` border i.p.v. `#1a1a1a`
- **Progress bars**: `brand_color` i.p.v. `bg-gray-800`
- **Booking question chips**: `brand_color` i.p.v. `bg-gray-800`
- **Focus rings**: `brand_color/30` i.p.v. `ring-gray-300`
- **Checkmark cirkel**: `brand_color` tint i.p.v. hardcoded `bg-green-100`

### 2. Subtiele UI polish

- **Input fields**: Verfijnd met `rounded-2xl` (consistent met knoppen), subtielere borders
- **Confirmation card**: Ticket naam prominent bovenaan, serif font voor restaurantnaam
- **Footer**: Restaurantnaam in lichtere tint, kleiner, eleganter
- **Spacing**: Iets meer lucht tussen secties (space-y-4 → space-y-5 waar nodig)

### 3. Accent color als secondary

De `config.accent_color` (ook beschikbaar) wordt gebruikt voor:
- "Welkom terug" heart icon
- Availability dots (medium → accent, low → red blijft)
- Secondary links hover state

### 4. Implementatie — CSS custom properties

In `BookingWidgetInner`, zet CSS custom properties op de container:
```
style={{
  '--widget-primary': config.brand_color || '#1a1a1a',
  '--widget-accent': config.accent_color || '#10B981',
}}
```

Dan in alle child components: `style={{ backgroundColor: 'var(--widget-primary)' }}` i.p.v. hardcoded waarden. Dit voorkomt prop-drilling en werkt met inline styles.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/BookingWidget.tsx` | CSS vars zetten, CTA knoppen, progress bars, summary |
| `src/components/booking/SelectionStep.tsx` | Datum/tijd/ticket selectie kleuren |
| `src/components/booking/GuestDetailsStep.tsx` | Submit knop, input focus, chips |
| `src/components/booking/ConfirmationStep.tsx` | Checkmark kleur, retry knop |
| `src/components/booking/BookingProgress.tsx` | Progress bars brand color |
| `src/components/booking/WaitlistForm.tsx` | CTA knop kleur |

## Wat NIET verandert

- Layout en flow (3 stappen, selector logica, embed mode)
- Typografie (Inter blijft)
- Achtergrondkleur (`#FAFAFA` blijft)
- Ambient background effect
- Functionele logica

## Resultaat

Een widget die eruitziet alsof het *van* het restaurant is — met hun kleuren — maar met de strakke Nesto-kwaliteit erachter. Vergelijkbaar met hoe Stripe Checkout de merchant-kleuren overneemt.

