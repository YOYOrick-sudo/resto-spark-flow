

# Fix: Recepten loading + visueel probleem

## Analyse

**Bug 1 — Blijvend loading scherm**: Vanuit de Gerechten detail pagina navigeert de inline-create naar `/recepten?open={id}`. Maar `Recepten.tsx` leest **geen query parameters** — er is geen `useSearchParams` logica. Het `selectedId` wordt dus nooit gezet, en het detail panel opent niet. Wat de gebruiker ziet is waarschijnlijk het NestoPanel dat wél opent (door de navigatie) maar met `receptId=null`, waardoor `useRecept(null)` disabled is en de Spinner eeuwig draait.

**Bug 2 — Visuele glitch bovenin**: Het NestoPanel overlay (z-[70]) overlapt met de pagina-layout. Het panel opent op `/recepten` terwijl de vorige pagina's panel mogelijk nog actief is, of de overlay wordt niet goed afgesloten bij navigatie.

## Oplossing

### 1. `Recepten.tsx` — lees `?open=` query param

```tsx
import { useSearchParams } from "react-router-dom";

// In component:
const [searchParams, setSearchParams] = useSearchParams();

// Init selectedId from query param
const [selectedId, setSelectedId] = React.useState<string | null>(
  searchParams.get("open")
);

// Sync query param on mount/change
React.useEffect(() => {
  const openId = searchParams.get("open");
  if (openId) {
    setSelectedId(openId);
    // Clean up the URL
    searchParams.delete("open");
    setSearchParams(searchParams, { replace: true });
  }
}, [searchParams]);
```

### 2. `NieuwReceptModal.tsx` — verwijder type selector

Volgens de architectuur-regels mag de Recepten pagina alleen halffabricaten tonen. Het type-selector veld ("Halffabricaat" / "Gerecht") moet weg. Type wordt hardcoded op `"halffabricaat"`.

```tsx
// Verwijder TYPE_OPTIONS en de NestoSelect voor type
// Hardcode: const type = "halffabricaat";
```

### 3. NestoPanel overlay cleanup

De visuele glitch bovenin (zichtbaar in screenshot: het panel-overlay dat over de tabel heen gaat) komt doordat het panel vanuit de vorige pagina (KaartbeheerDetail) nog open is terwijl er genavigeerd wordt. Bij navigatie moet het panel sluiten. Dit wordt al automatisch opgelost door punt 1: het panel opent pas correct op de recepten pagina met het juiste ID.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/Recepten.tsx` | `useSearchParams` toevoegen, `?open=` param lezen en opschonen |
| `src/components/recepten/NieuwReceptModal.tsx` | Type selector verwijderen, hardcode `halffabricaat` |

