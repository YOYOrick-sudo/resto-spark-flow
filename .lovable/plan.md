
# "Welkom terug" Banner — Enterprise Upgrade

## Wat verandert

De huidige banner is een generieke groene balk met een standaard emoji (🎉). We maken hem eigener en meer in lijn met de widget-esthetiek.

### 1. Eigen icoon in plaats van emoji
Vervang de `🎉` emoji door een Lucide `Heart` icoon (of `Sparkles`) — klein, inline, past bij de enterprise widget-stijl. Geen emoji's in een professionele booking flow.

### 2. Subtielere, warmere styling
De huidige `bg-green-50 border-green-200 text-green-700` is te "alert-achtig". Nieuw ontwerp:

- Achtergrond: lichte primary tint via de widget's eigen primary color (inline style met opacity), zodat het aansluit bij de branding van het restaurant
- Geen harde border — alleen een subtiele achtergrondkleur
- Tekst in twee regels: naam prominent (font-semibold), subtekst eronder ("Fijn je weer te zien")
- Klein icoon links of boven de tekst

### 3. Concrete wijziging

**Bestand:** `src/components/booking/GuestDetailsStep.tsx` (regels 79-84)

**Van:**
```tsx
<div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-sm text-center text-green-700">
  Welkom terug, {welcomeBack}! 🎉
</div>
```

**Naar:**
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

Neutrale kleuren (gray-50/100) zodat het werkt met elke restaurant-branding. Geen border, geen emoji, geen alert-kleuren. Een warm maar professioneel welkomstbericht met een eigen Lucide icoon.

### Import toevoegen
`Heart` uit `lucide-react` toevoegen aan de bestaande import (waar al `User`, `Mail`, `Phone`, `Loader2` staan).
