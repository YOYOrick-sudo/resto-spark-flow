

# Polar UI Unificatie

## Overzicht
Button import vervangen, `nesto-card-base` CSS class verwijderen en stub pagina's opwaarderen met PageHeader + EmptyState. NestoSelect label styling gelijktrekken met NestoInput.

## Stap 1: Button unificatie — AppLayout.tsx

Het enige custom bestand dat `@/components/ui/button` importeert is `AppLayout.tsx` (de 5 hits in `src/components/ui/` zijn ShadCN-intern en blijven ongewijzigd).

- Vervang `import { Button } from '@/components/ui/button'` door `import { NestoButton } from '@/components/polar/NestoButton'`
- `<Button variant="ghost" size="icon">` wordt `<NestoButton variant="ghost" size="icon">`

## Stap 2: nesto-card-base verwijderen

### 2a. CSS class verwijderen uit `src/index.css`
De `.nesto-card-base` class definitie wordt verwijderd uit `@layer components`.

### 2b. Stub pagina's opwaarderen (11 bestanden)
Elke pagina die `nesto-card-base` gebruikt krijgt PageHeader + EmptyState in plaats van raw `<h1>` + `<div className="nesto-card-base">`:

| Bestand | Titel | Lege-state tekst | Icoon |
|---------|-------|-------------------|-------|
| `Recepten.tsx` | Recepten | Nog geen recepten toegevoegd | BookOpen |
| `Halffabricaten.tsx` | Halffabricaten | Nog geen halffabricaten toegevoegd | Layers |
| `Kaartbeheer.tsx` | Kaartbeheer | Nog geen gerechten toegevoegd | UtensilsCrossed |
| `Kostprijzen.tsx` | Kostprijzen | Nog geen kostprijzen berekend | Calculator |
| `MepTaken.tsx` | MEP Taken | Nog geen MEP taken aangemaakt | ClipboardList |
| `Taken.tsx` | Taken & Checklists | Nog geen taken aangemaakt | CheckSquare |
| `Inkoop.tsx` | Inkoop | Nog geen bestellingen gevonden | ShoppingCart |
| `SettingsVoorkeuren.tsx` | Voorkeuren | Configuratie volgt binnenkort | Settings |
| `SettingsLeveranciers.tsx` | Leveranciers | Configuratie volgt binnenkort | Truck |
| `SettingsInkoop.tsx` | Inkoop Instellingen | Configuratie volgt binnenkort | ShoppingBag |

Elke stub wordt:
```tsx
import { PageHeader, EmptyState } from "@/components/polar";
import { BookOpen } from "lucide-react";

export default function Recepten() {
  return (
    <div className="space-y-6">
      <PageHeader title="Recepten" subtitle="Beheer alle recepten voor je restaurant." />
      <EmptyState
        icon={BookOpen}
        title="Nog geen recepten toegevoegd"
        description="Voeg je eerste recept toe om te beginnen."
      />
    </div>
  );
}
```

### 2c. Detail stub pagina's (3 bestanden)
`ReceptenDetail.tsx`, `HalffabricatenDetail.tsx`, `KaartbeheerDetail.tsx` — zelfde patroon maar met `DetailPageLayout` of simpel PageHeader + EmptyState.

### 2d. SettingsKeuken.tsx
De 4 `nesto-card-base` divs worden vervangen door `<EmptyState>` componenten (zonder wrapper div, de EmptyState is al gestyled).

## Stap 3: NestoSelect label fix

Huidige NestoSelect label: `mb-1.5 block text-xs text-muted-foreground`
NestoInput label: `mb-2 block text-label text-muted-foreground`

Fix NestoSelect label naar: `mb-2 block text-label text-muted-foreground` — identiek aan NestoInput.

## Stap 4: Border-radius tokens

De border-radius tokens bestaan al in `tailwind.config.ts` (`rounded-card`, `rounded-card-sm`, `rounded-button`, `rounded-control`, `rounded-dropdown`). Er is een hardcoded `rounded-2xl` in `Ingredienten.tsx` (regel 394) die vervangen wordt door `rounded-card`.

## Bestanden overzicht

| Bestand | Wijziging |
|---------|-----------|
| `src/components/layout/AppLayout.tsx` | Button import naar NestoButton |
| `src/index.css` | Verwijder `.nesto-card-base` class |
| `src/components/polar/NestoSelect.tsx` | Label styling gelijktrekken |
| `src/pages/Recepten.tsx` | PageHeader + EmptyState |
| `src/pages/Halffabricaten.tsx` | PageHeader + EmptyState |
| `src/pages/Kaartbeheer.tsx` | PageHeader + EmptyState |
| `src/pages/Kostprijzen.tsx` | PageHeader + EmptyState |
| `src/pages/MepTaken.tsx` | PageHeader + EmptyState |
| `src/pages/Taken.tsx` | PageHeader + EmptyState |
| `src/pages/Inkoop.tsx` | PageHeader + EmptyState |
| `src/pages/SettingsVoorkeuren.tsx` | PageHeader + EmptyState |
| `src/pages/SettingsLeveranciers.tsx` | PageHeader + EmptyState |
| `src/pages/SettingsInkoop.tsx` | PageHeader + EmptyState |
| `src/pages/SettingsKeuken.tsx` | EmptyState vervangt nesto-card-base |
| `src/pages/ReceptenDetail.tsx` | PageHeader + EmptyState |
| `src/pages/HalffabricatenDetail.tsx` | PageHeader + EmptyState |
| `src/pages/KaartbeheerDetail.tsx` | PageHeader + EmptyState |
| `src/pages/Ingredienten.tsx` | rounded-2xl naar rounded-card |

Totaal: 18 bestanden gewijzigd.
