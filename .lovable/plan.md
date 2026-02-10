

# Soepele Paginatransities binnen Modules

## Probleem

Bij navigatie binnen een module (bijv. klikken op een kandidaat in Onboarding) wisselt de pagina-inhoud direct zonder enige visuele transitie. Dit voelt abrupt en niet passend bij een enterprise SaaS product.

## Oplossing

Een subtiele **fade-in animatie** toevoegen aan alle pagina-overgangen via de `AppShell`. Dit wordt gedaan door de `<Outlet />` te wrappen in een component dat bij elke route-wisseling een korte fade-in triggert, met een `key` gebaseerd op het huidige pad.

## Wat verandert

### 1. AppShell.tsx — Animated Outlet

De `<Outlet />` wordt gewrapt in een `<div>` met:
- Een `key` gebaseerd op `location.pathname` zodat React het element opnieuw mount bij navigatie
- De bestaande `animate-fade-in` CSS class (al aanwezig in het design system)
- Een verkorte animatie-duur (0.15s i.p.v. 0.3s) voor snelle, subtiele feedback

### 2. tailwind.config.ts — Snelle fade variant

Een extra animatie `fade-in-fast` toevoegen:
- Duur: 0.15s (de helft van de standaard fade-in)
- Easing: cubic-bezier(0.4, 0, 0.2, 1) — consistent met sidebar animaties
- Alleen opacity, geen translateY (voorkomt "springerig" gevoel bij pagina's)

## Technische details

### AppShell.tsx

```tsx
import { Outlet, useLocation } from 'react-router-dom';
import { AppLayout } from './AppLayout';

export function AppShell() {
  const location = useLocation();

  return (
    <AppLayout>
      <div key={location.pathname} className="animate-fade-in-fast">
        <Outlet />
      </div>
    </AppLayout>
  );
}
```

### tailwind.config.ts

Nieuwe keyframe en animatie toevoegen:

```
"fade-in-fast": {
  "0%": { opacity: "0" },
  "100%": { opacity: "1" }
}

animation: {
  "fade-in-fast": "fade-in-fast 0.15s cubic-bezier(0.4, 0, 0.2, 1)"
}
```

## Wat niet verandert

- Geen database wijzigingen
- Geen nieuwe dependencies
- Geen wijzigingen aan individuele pagina's
- Sidebar animaties blijven zoals net verbeterd
- Routing structuur blijft identiek

