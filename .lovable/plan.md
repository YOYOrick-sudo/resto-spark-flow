

# Ronde 3: Polish & Accessibility

## Overzicht

De laatste ronde van de Widget V2 redesign. Drie pijlers: skeleton loading states, stap transities met animatie, en micro-interacties. Plus accessibility en `prefers-reduced-motion` support.

---

## 1. Skeleton Loading States

Dedicated skeletons voor de twee "data fetch" momenten in de widget.

### Kalender skeleton (DateGuestsStep.tsx)

Vervangt de huidige "Beschikbaarheid laden..." tekst (regel 116-117) door een visuele skeleton:

- 7 kolommen header (Ma-Zo): 7 kleine `Skeleton` bars
- 5 rijen x 7 kolommen: 35 ronde blokjes (40x40px), `animate-pulse`, `bg-gray-100 rounded-lg`
- Zelfde afmetingen als de echte kalender zodat er geen layout shift is
- Toon skeleton wanneer `availableDatesLoading` true is, verberg echte kalender

### Tijdslot skeleton (TimeTicketStep.tsx)

Vervangt de huidige `Loader2` spinner (regel 64-68) door een grid skeleton:

- 1 shift header skeleton: `Skeleton h-3 w-24`
- 3 kolommen x 4 rijen: 12 pill-shaped blokjes (44px hoog), `animate-pulse`, `bg-gray-100 rounded-lg`
- Toon wanneer `availabilityLoading` true is

### Implementatie

Beide skeletons worden inline in hun component gebouwd (geen apart bestand nodig). Gebruiken de bestaande `Skeleton` component uit `@/components/ui/skeleton`.

---

## 2. Stap Transities (Slide + Fade)

Stappen schuiven in/uit bij navigatie, met richting-awareness.

### Aanpak

In `BookingWidget.tsx`, de `renderStep()` output wrappen in een transitie-container:

- **State**: `prevStep` bijhouden naast `step`
- **Richting**: `step > prevStep` = vooruit (slide left), `step < prevStep` = terug (slide right)
- **CSS**: Combinatie van `translateX` + `opacity` transitie, 250ms ease-out
- **Keyframes** in tailwind.config.ts:
  - `slide-in-left`: `translateX(30px), opacity(0)` naar `translateX(0), opacity(1)`
  - `slide-in-right`: `translateX(-30px), opacity(0)` naar `translateX(0), opacity(1)`
- **Key prop**: `step` als key op de wrapper div, zodat React een nieuwe mount triggert bij elke stap wissel

### Bestanden

- `tailwind.config.ts`: 2 nieuwe keyframes + animation utilities
- `BookingWidget.tsx`: Transitie wrapper met richting-logica

---

## 3. Micro-interacties

Subtiele feedback op user actions binnen de widget.

### Button hover/press (alle CTA knoppen)

Tailwind classes toevoegen aan de 4 primaire CTA knoppen (DateGuestsStep, TimeTicketStep, GuestDetailsStep submit, ConfirmationStep manage):

- Hover: `hover:scale-[1.02] hover:shadow-md` (150ms via `transition-all duration-150`)
- Press: `active:scale-[0.98]` (instant)

### Slot selectie pop (TimeTicketStep.tsx)

Bij het klikken op een tijdslot:

- Geselecteerde slot krijgt: `transform: scale(1.05)` die na 200ms terugkeert naar `scale(1)`
- Implementatie: korte CSS class toggle via een `selectedAnim` state die na 200ms reset

### Calendar dag selectie (DateGuestsStep.tsx)

- Geselecteerde dag: `scale(1.1)` -> `scale(1)` via `transition-transform duration-150`
- Dit wordt via `modifiersStyles` op de Calendar toegepast

### Ticket kaart hover (TicketSelectStep.tsx)

Al geimplementeerd: `hover:-translate-y-0.5`. Toevoegen:

- `hover:shadow-lg` (was `0 1px 3px`, wordt `0 4px 12px` bij hover)
- `active:scale-[0.99]` voor press feedback

---

## 4. prefers-reduced-motion Support

### Aanpak

- Alle nieuwe animaties in tailwind.config.ts wrappen met `@media (prefers-reduced-motion: reduce)` fallback
- In de tailwind keyframes: geen wijziging nodig, we voegen een globale CSS rule toe in `index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- De checkmark animatie in ConfirmationStep: de `<style>` tag krijgt een `@media` wrapper zodat de SVG direct in eindstaat rendert
- Stap transities: bij reduced motion verschijnt de nieuwe stap instant (geen slide)

---

## 5. Accessibility Audit

Concrete fixes op bestaande componenten.

### ARIA attributen

| Component | Fix |
|-----------|-----|
| TimeTicketStep slot grid | `role="listbox"` op de grid container, `role="option"` + `aria-selected` op elk slot |
| Party size stepper | `aria-label="Minder gasten"` / `"Meer gasten"` op de +/- knoppen |
| TicketSelectStep kaarten | `role="listbox"` op container, `role="option"` + `aria-selected` op kaarten |
| BookingProgress dots | `role="progressbar"` + `aria-valuenow` + `aria-valuemax` |
| Calendar | `aria-live="polite"` op de beschikbaarheid loading/status tekst |

### Keyboard navigatie

- Tijdslots: `tabIndex={0}` op elk slot, `onKeyDown` handler voor Enter/Space
- Ticket kaarten: al `<button>` elementen, keyboard werkt al
- Party size: al `<button>` elementen

### Focus indicators

- Alle interactieve elementen: `focus-visible:ring-2 focus-visible:ring-offset-2` met primaryColor
- Tijdslots: `focus-visible:outline-none focus-visible:ring-2` met inline style voor primaryColor

### Touch targets

- Alle knoppen zijn al minimaal 40x40px of 44px hoog -- voldoet aan WCAG 2.1 AA

---

## Bestanden overzicht

| Bestand | Actie | Samenvatting |
|---------|-------|--------------|
| `src/components/booking/DateGuestsStep.tsx` | Wijzigen | Kalender skeleton, micro-interactie op dag selectie, ARIA op stepper |
| `src/components/booking/TimeTicketStep.tsx` | Wijzigen | Slot grid skeleton, slot selectie pop, ARIA listbox, keyboard nav |
| `src/components/booking/TicketSelectStep.tsx` | Wijzigen | Hover shadow upgrade, press feedback, ARIA listbox |
| `src/components/booking/GuestDetailsStep.tsx` | Wijzigen | CTA hover/press micro-interactie |
| `src/components/booking/ConfirmationStep.tsx` | Wijzigen | Reduced-motion checkmark, CTA micro-interactie |
| `src/components/booking/BookingProgress.tsx` | Wijzigen | ARIA progressbar |
| `src/pages/BookingWidget.tsx` | Wijzigen | Stap transitie wrapper met richting-logica |
| `tailwind.config.ts` | Wijzigen | 2 nieuwe keyframes (slide-in-left/right) |
| `src/index.css` | Wijzigen | prefers-reduced-motion globale regel |

### Geen database wijzigingen nodig

