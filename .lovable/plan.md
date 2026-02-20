
# Mockup A: Opschonen & Meer Nesto

## Samenvatting

Mockup A wordt rustiger, compacter en meer Nesto-achtig. De tickets worden kleiner en minder "druk", het logo scrollt mee (niet sticky), en de CTA-knop toont stap-voortgang ("Volgende 1/4").

---

## Wijzigingen

### 1. Ticket cards: kleiner en rustiger

- Aspect ratio van `1.8/1` naar `2.4/1` -- veel lager, compacter
- Verwijder de dubbele gradient-overlays, backdrop-blur en de sparkle-glow effecten
- Eenvoudiger: een enkele subtiele gradient onderaan (`from-black/50 to-transparent`)
- Ticket naam niet meer uppercase/tracking-wide, gewoon `font-semibold text-sm`
- Content padding iets compacter: `px-4 py-3` in plaats van `px-5 py-3.5`
- Gap tussen cards blijft `gap-4` maar cards zijn visueel kleiner

### 2. Logo header: scrollbaar (niet sticky)

- Header verplaatsen van buiten de scroll-container naar erin
- Logo + progress dots worden onderdeel van de scrollbare content, niet `shrink-0`

### 3. CTA-knop: stap-indicator

- Button tekst wordt `Volgende (1/4)` in plaats van alleen `Volgende`
- Bij stap 4: blijft `Bevestigen`

### 4. Visueel rustiger

- Verwijder de animated sparkles bij de bevestigingsstap
- Verwijder de hover `translateY` lift-effect op ticket cards
- Verwijder de `scale-105` op geselecteerde datum en tijdslots
- Shadows iets subtieler: minder lagen
- Populair-badge op tijdslots verwijderen (te druk)

### 5. Meer Nesto-feel

- Font wijzigen naar Inter (zelfde als Mockup B) zodat het meer bij Nesto aansluit
- Achtergrondkleur naar `#FAFAFA` (iets koeler, meer Nesto)
- Scroll-fade indicator onderaan tickets behouden (dat is subtiel genoeg)

---

## Technische details

Alleen `src/components/widget-mockups/MockWidgetA.tsx` wordt aangepast:

- Font import toevoegen: Inter via Google Fonts link tag
- `fontFamily` naar `"'Inter', system-ui, sans-serif"`
- Header + progress dots verplaatsen naar binnen de `overflow-y-auto` container
- Ticket image aspect ratio: `style={{ aspectRatio: '2.4/1' }}`
- Gradient vereenvoudigen: enkele `bg-gradient-to-t from-black/50 to-transparent`
- Verwijder `hover:-translate-y-0.5` class
- Verwijder `scale-105` op datum/tijd selecties
- CTA tekst: `{step === 4 ? 'Bevestigen' : \`Volgende (${step}/4)\`}`
- Verwijder Sparkles import en alle sparkle-elementen uit stap 5
- Verwijder de `sparkle` keyframe animatie
