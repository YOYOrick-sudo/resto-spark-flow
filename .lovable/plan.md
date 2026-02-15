

# docs/MODULE_CHECKLIST.md aanmaken

## Wat
Een nieuw bestand `docs/MODULE_CHECKLIST.md` met de door jou opgegeven checklist, met 1 correctie:

## Correctie: Punt 6 — Route toevoegen

Het project gebruikt momenteel **directe imports**, geen `lazy()` + `Suspense`. Alle 30+ pagina's worden bovenaan `App.tsx` geimporteerd (regel 11-52) en direct als element meegegeven aan `<Route>`.

**Jouw versie:**
```
const Page = lazy(() => import('./pages/Page'))
<Suspense fallback={<PageSkeleton />}>
```

**Aangepast naar actueel patroon:**
```
// Bovenaan App.tsx:
import Finance from "./pages/Finance";

// In Routes:
<Route path="/finance" element={<Finance />} />
```

Met een opmerking dat lazy loading een toekomstige optimalisatie is (Fase 14).

## Overige inhoud
Exact zoals jij het hebt geschreven — punten 1-5, 7, 8, 9 kloppen allemaal met de codebase.

## Technisch
1 nieuw bestand: `docs/MODULE_CHECKLIST.md`. Geen bestaande bestanden worden gewijzigd.
