

# Error Boundaries toevoegen

## Waarom

Zonder Error Boundaries crasht een fout in een willekeurige pagina-component de hele React app (wit scherm). Met Error Boundaries wordt alleen het getroffen onderdeel vervangen door een nette foutmelding, terwijl sidebar en navigatie intact blijven.

## Wat er verandert

| Bestand | Wijziging |
|---------|-----------|
| `src/components/polar/NestoErrorBoundary.tsx` | Nieuw bestand: class component met friendly error UI |
| `src/components/polar/index.ts` | Export toevoegen |
| `src/components/layout/AppShell.tsx` | `<Outlet>` wrappen in `<NestoErrorBoundary>` (isoleert pagina-crashes) |
| `src/App.tsx` | `<Routes>` wrappen in `<NestoErrorBoundary>` (vangt app-brede crashes) |

## Technische details

### 1. `NestoErrorBoundary.tsx`

- React class component (vereist voor Error Boundaries)
- `componentDidCatch`: logt error naar `console.error` (later vervangbaar door Sentry)
- Fallback UI met bestaande Polar componenten:
  - `NestoCard` wrapper
  - `AlertTriangle` icon uit lucide-react
  - Titel: "Er ging iets mis"
  - Beschrijving: "Dit onderdeel kon niet worden geladen. Probeer de pagina te vernieuwen."
  - `NestoButton`: "Pagina vernieuwen" (`window.location.reload()`)
  - `NestoButton variant="ghost"`: "Terug naar Dashboard" (link naar `/`)
- Accepteert optionele `fallback` prop voor custom error UI

### 2. `AppShell.tsx`

Wrap `<Outlet />` in `<NestoErrorBoundary>` zodat een crash in een pagina-component alleen die pagina raakt. De sidebar en navigatie blijven functioneren.

### 3. `App.tsx`

Wrap de gehele `<Routes>` in een `<NestoErrorBoundary>` als vangnet voor crashes buiten de AppShell (bijv. auth pagina, 404).

### Resultaat

```text
NestoErrorBoundary (app-niveau)
  +-- Routes
       +-- /auth
       +-- AppShell (sidebar + navigatie)
            +-- NestoErrorBoundary (pagina-niveau)
                 +-- <Outlet /> (actieve pagina)
```

Een crash in een pagina toont de error UI alleen in het content-gebied. Sidebar en navigatie blijven bruikbaar.

