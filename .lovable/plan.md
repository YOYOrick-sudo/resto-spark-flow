
# Beide Widget Mockups: Echt Bijzonder Maken

## Visie

Beide mockups worden opgetild van "functioneel prototype" naar "dit wil ik als restaurateur op mijn site". Het verschil zit in micro-details, animatie-gevoel, visuele laagjes en een premium afwerking die je bij Resy, Tock of OpenTable niet ziet.

---

## Mockup A: "Boutique Luxe"

De warme variant wordt een echte boutique-ervaring met filmische sfeer.

### Ticket Cards (Step 1)
- **Grotere hero images**: aspect ratio naar `aspect-[1.8/1]` zodat de foto's meer domineren
- **Gradient overlay verrijkt**: van simpel `from-black/50` naar een dubbele gradient met een subtiele blur-laag onderaan voor een filmisch, cinematic gevoel
- **Ticket naam in uppercase tracking-wide**: meer luxe typografie op de afbeelding
- **Geselecteerde staat**: zachte pulserende glow-ring rond de kaart (CSS `animate-pulse`-achtig maar subtieler, via box-shadow transition)
- **Derde ticket toevoegen**: "Sunday Brunch" met een derde Unsplash foto, maakt het visueel rijker

### Datum & Gasten (Step 2)
- **Datum scroller**: geselecteerde datum krijgt een subtiele scale-up (`scale-105`) en een shadow
- **Gastenteller**: grotere, elegantere ronde knoppen met een fijne border en zachte inset shadow
- **Sectie-iconen**: klein kalender-icon naast "Datum", klein users-icon naast "Gasten" voor visuele ankers

### Tijdslots (Step 3)
- **Populaire tijden markering**: `19:00` en `19:30` krijgen een klein "Populair" badge/dot
- **Geselecteerde tijd**: niet alleen donkere achtergrond maar ook een subtiele scale-up en shadow
- **Unavailable slots**: `21:00` als disabled/doorgestreept om realisme toe te voegen

### Formulier (Step 4)
- **Gegroepeerde velden**: voornaam/achternaam naast elkaar in een 2-kolom grid
- **Focus states**: warme gouden/amber glow bij focus in plaats van grijze ring
- **Veld iconen**: subtiele icons (User, Mail, Phone) in de input velden

### Bevestiging (Step 5)
- **Animated checkmark**: CSS-animatie die inschaalt bij verschijnen
- **Confetti-achtige decoratie**: een paar kleine sterretjes/sparkles rond de checkmark (pure CSS)
- **Samenvatting als "ticket"**: de bevestigingskaart met een dashed border-top om het als een "bonnetje" te laten voelen
- **QR-code placeholder**: een nep QR-blokje onderaan voor realisme

### Algemeen
- **Soepelere transities**: step-wisseling met een fade-effect (opacity transition)
- **Scroll indicator**: bij ticket stap een subtiel gradient-fade aan de onderkant als er meer content is

---

## Mockup B: "Nesto Enterprise"

De strakke variant wordt een echt SaaS-grade enterprise widget -- denk aan Stripe Checkout of Linear.

### Ticket Cards (Step 1)
- **Glassmorphism accent**: geselecteerde kaart krijgt een subtiele `backdrop-blur` achtergrond-highlight
- **Radio-indicator**: een custom radio-cirkel links die invult bij selectie (leeg = ring, geselecteerd = filled dot)
- **Derde ticket**: "Sunday Brunch" ook hier, maar in horizontaal compact formaat
- **Hover state**: lichte achtergrondkleur-shift + border-kleur transitie

### Datum & Gasten (Step 2)
- **Mini-kalender grid**: compacter met een "vandaag" indicator (kleine dot onder het getal)
- **Weekend kleuring**: zaterdag/zondag licht andere tint dan doordeweeks
- **Gast stepper**: strakke pill-vorm met monospacefont voor het getal

### Tijdslots (Step 3)
- **Chip-stijl**: slots als horizontale pills in een flex-wrap layout in plaats van grid
- **Beschikbaarheid indicator**: groene dot voor "veel beschikbaar", oranje voor "bijna vol"
- **Geselecteerde chip**: gevuld met een checkmark icon erin

### Formulier (Step 4)
- **Stacked card-layout**: het hele formulier in een enkele card met interne dividers
- **Inline validatie**: als email-veld ingevuld is, een klein groen vinkje rechts
- **Compactere spacing**: alles dichter op elkaar, meer informatiedichtheid

### Bevestiging (Step 5)
- **Success banner**: in plaats van grote cirkel, een smalle banner bovenaan met checkmark + tekst
- **Timeline-achtig**: de samenvatting als een verticale timeline met dots en lijnen
- **"Add to calendar" knop**: een nep-knop die het professioneler maakt
- **Referentienummer**: een fake `#NES-2847` reserveringsnummer voor realisme

### Stepper (bovenaan)
- **Verfijnd**: verbindingslijnen worden een gradient die invult naarmate je vordert
- **Micro-animatie**: de actieve stap-cirkel pulseert subtiel

### Algemeen
- **Keyboard hints**: subtiele "Press Enter" tekst naast de CTA-knop
- **Progress in CTA**: "Volgende (2/4)" in de button tekst

---

## Mock Data uitbreiden

Een derde ticket toevoegen aan `mockData.ts`:

```text
Sunday Brunch
"Ontspan met een uitgebreid brunchbuffet op zondagochtend."
Unsplash brunch-foto
2-8 gasten
€ 45 p.p.
```

En een extra timeslot `21:30` markeren als unavailable.

---

## Technische aanpak

### Bestanden die worden aangepast

1. **`src/components/widget-mockups/mockData.ts`** -- derde ticket + availability data
2. **`src/components/widget-mockups/MockWidgetA.tsx`** -- volledige redesign met alle Boutique Luxe upgrades
3. **`src/components/widget-mockups/MockWidgetB.tsx`** -- volledige redesign met alle Enterprise upgrades

### Geen nieuwe dependencies

Alles wordt gebouwd met:
- Tailwind CSS classes (inclusief `animate-`, `backdrop-blur`, `scale-`)
- Inline styles voor complexe shadows en gradients
- Lucide icons (al geinstalleerd)
- CSS keyframe animaties via Tailwind's `animate-` utilities

### Wat NIET verandert
- `PhoneFrame.tsx` -- blijft hetzelfde
- `WidgetMockups.tsx` -- pagina-layout blijft hetzelfde
- Route configuratie -- ongewijzigd
