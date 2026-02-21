

# "Welkom terug" Banner — Zichtbaarheid Fix

## Probleem

De widget-achtergrond is `#FAFAFA` en de banner gebruikt `bg-gray-50` (`#F9FAFB`) — slechts 1 shade verschil. Daardoor lijkt het alsof er een vage, onzichtbare card staat. Het icoon-cirkeltje (`bg-gray-100`) is ook nauwelijks zichtbaar.

## Oplossing

Verwijder de achtergrondkleur van de banner volledig. Geen card, geen cirkel-achtergrond. In plaats daarvan een **borderless inline element** — puur tekst + icoon, zonder container-styling. Dit past beter bij de widget-esthetiek waar het formulier zelf al het visuele anker is.

### Bestand: `src/components/booking/GuestDetailsStep.tsx`

**Van (regels 81-89):**
```tsx
<div className="rounded-2xl bg-gray-50 px-4 py-3 flex items-center gap-3">
  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
    <Heart className="w-4 h-4 text-gray-500" />
  </div>
  <div className="text-left">
    <p className="text-sm font-semibold text-gray-800">Welkom terug, {welcomeBack}</p>
    <p className="text-xs text-gray-500">Fijn je weer te zien</p>
  </div>
</div>
```

**Naar:**
```tsx
<div className="flex items-center gap-2.5 px-1">
  <Heart className="w-4 h-4 text-gray-400 flex-shrink-0" />
  <div className="text-left">
    <p className="text-sm font-semibold text-gray-700">Welkom terug, {welcomeBack}</p>
    <p className="text-xs text-gray-400">Fijn je weer te zien</p>
  </div>
</div>
```

### Wat verandert

- Achtergrondkleur verwijderd (geen ghost-card meer)
- Icoon-cirkel verwijderd — Heart icoon staat nu direct inline
- Iets warmere tekstkleuren (gray-700 i.p.v. gray-800) voor subtielere uitstraling
- Compact, borderless — past bij de "data is het design" filosofie

