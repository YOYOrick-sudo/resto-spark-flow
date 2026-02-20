

# 3 widget-fixes: dubbele X, logo-flash, snelheid

## 1. Dubbele sluitknop verwijderen

De close button op regels 147-153 in `BookingWidget.tsx` wordt verwijderd. De `widget.js` heeft al een eigen sluitknop bovenaan het panel. De embed header toont alleen nog het logo (als dat is ingesteld).

**Bestand:** `src/pages/BookingWidget.tsx`
- Verwijder de `<button onClick={handleClose}>` uit de embed header (regels 147-153)
- De header wordt vereenvoudigd tot alleen het logo

## 2. Logo-flash oplossen

Het skeleton in `widget.js` toont het restaurantlogo en -naam (als data-logo en data-name attributen meegegeven zijn). Wanneer de iframe vervolgens laadt, toont die hetzelfde logo opnieuw. Tijdens de overgang is er kort een dubbel logo zichtbaar.

**Bestand:** `src/pages/BookingWidget.tsx`
- In embed-modus wordt het logo in de header verborgen zolang de config nog aan het laden is (de skeleton van widget.js toont het al)
- Dit voorkomt de "flash" van een tweede logo

## 3. Sneller openen

De huidige loading state toont een kale spinner. Dit voelt traag. Twee verbeteringen:

**Bestand:** `src/pages/BookingWidget.tsx`
- Vervang de spinner-loading door een lichte skeleton die past bij de widget-layout (vergelijkbaar met wat widget.js al doet)
- Stuur een `nesto:ready` postMessage zodra de config geladen is, zodat widget.js het skeleton sneller kan verwijderen

**Bestand:** `public/widget.js`
- Luister op het `nesto:ready` bericht om het skeleton direct te verwijderen (in plaats van te wachten op het standaard iframe load-event)
- Dit maakt de overgang van skeleton naar content veel vloeiender

## Technische details

### BookingWidget.tsx - embed header (was)
```tsx
{isEmbed && (
  <header className="shrink-0 relative flex flex-col items-center gap-2 px-5 pt-4 pb-1">
    <button onClick={handleClose} className="absolute top-4 right-5 ...">
      <X className="h-4 w-4" />
    </button>
    {config.logo_url && <img ... />}
  </header>
)}
```

### BookingWidget.tsx - embed header (wordt)
```tsx
{isEmbed && config.logo_url && (
  <header className="shrink-0 flex flex-col items-center gap-2 px-5 pt-4 pb-1">
    <img src={config.logo_url} alt={config.location_name ?? 'Restaurant'} className="h-20 object-contain" />
  </header>
)}
```

### BookingWidget.tsx - loading state (wordt)
In plaats van een spinner, een subtiel skeleton met dezelfde achtergrondkleur (#FAFAFA) en een postMessage `nesto:ready` zodra de config geladen is.

### widget.js - nesto:ready listener
Voegt een event listener toe die op `nesto:ready` het skeleton direct verwijdert, zodat de content sneller zichtbaar wordt zonder te wachten op het volledige iframe load event.

