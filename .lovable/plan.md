

# Standaardiseer layout, spacing en sidebar

## Overzicht
4 bestanden worden aangepast: AppLayout.tsx, Reserveringen.tsx, Dashboard.tsx, NestoSidebar.tsx.

## Stap 1 — Page padding & fullBleed prop (AppLayout.tsx)

De `AppLayoutProps` interface krijgt een optionele `fullBleed?: boolean` prop. Wanneer `fullBleed` true is, wordt de page content div zonder padding gerenderd (`p-0`). De standaard padding (`py-6 px-8 lg:py-8 lg:px-12 xl:px-16`) blijft ongewijzigd voor normale pagina's.

## Stap 2 — Reserveringen padding verwijderen (Reserveringen.tsx)

De Reserveringen-pagina heeft eigen padding (`p-4` op regel 108 en 141). Deze pagina wordt gewrapped met `fullBleed` in de router, en de interne `p-4` classes worden verwijderd (de AppLayout padding is al voldoende). Alternatief: als Reserveringen echt edge-to-edge moet (grid view), dan wordt `fullBleed` gebruikt en blijft de interne padding behouden.

Na inspectie: de Reserveringen-pagina heeft een eigen header/footer layout die het hele scherm vult (`h-full`). Dit is een full-bleed pagina. De `p-4` wordt behouden maar AppLayout wrapped deze route met `fullBleed`.

**Aanpak:** AppLayout krijgt de `fullBleed` prop. In `App.tsx` wordt de Reserveringen-route gewrapped met `fullBleed`. De `p-4` in Reserveringen.tsx blijft (eigen interne spacing).

## Stap 3 — Dashboard grid (Dashboard.tsx)

Regel 53: `grid-cols-1 sm:grid-cols-2` wordt `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. De derde tile (ReceptenTile) staat dan naast de andere twee op grote schermen.

## Stap 4 — Sidebar collapsed mode (NestoSidebar.tsx + AppLayout.tsx)

Een collapsed state wordt toegevoegd voor schermen 768-1024px:
- NestoSidebar krijgt een `collapsed?: boolean` prop en een `onToggleCollapse` callback
- In collapsed mode: breedte wordt 56px, alleen iconen worden getoond, labels/search/footer verborgen
- AppLayout beheert de state: standaard collapsed op `md` breakpoint (768-1024px), expanded op `lg+`
- Een collapse-knop onderaan de sidebar (PanelLeft icoon) togglet de state
- De bestaande `PanelLeft` button in de header wordt de toggle

| Bestand | Wijziging |
|---------|-----------|
| `src/components/layout/AppLayout.tsx` | `fullBleed` prop, collapsed state, sidebar op md breakpoint tonen (was lg), `id="main-content"` conditioneel padding |
| `src/components/layout/NestoSidebar.tsx` | `collapsed` prop, icon-only mode, collapse toggle button, duration-150 naar duration-200 (3x) |
| `src/pages/Reserveringen.tsx` | Geen wijziging (blijft eigen padding, fullBleed via route) |
| `src/pages/Dashboard.tsx` | Grid naar lg:grid-cols-3 |
| `src/App.tsx` | Reserveringen route met fullBleed prop |

## Stap 5 — Transition durations (NestoSidebar.tsx)

3 instances van `duration-150` op regels 156, 197, 225 worden `duration-200`.

## Technisch detail

### AppLayout.tsx wijzigingen:
- Interface: `fullBleed?: boolean` toevoegen
- Sidebar aside: `hidden lg:flex` wordt `hidden md:flex` zodat de sidebar ook op tablets zichtbaar is
- Collapsed state: `const [sidebarCollapsed, setSidebarCollapsed] = useState(false)` + media query listener voor automatisch collapsed onder 1024px
- Sidebar breedte: `w-60` wordt conditioneel `w-14` (collapsed) of `w-60` (expanded)
- Page content div: conditioneel `p-0` wanneer `fullBleed` true is
- Mobile header: `lg:hidden` wordt `md:hidden`

### NestoSidebar.tsx wijzigingen:
- Props: `collapsed?: boolean`, `onToggleCollapse?: () => void`
- Root div: `w-60` wordt conditioneel `w-14` of `w-60` met `transition-all duration-200`
- Collapsed mode: header toont alleen logo-icoon, search/nav-labels/footer verborgen
- Nav items: in collapsed mode alleen icoon met tooltip
- PanelLeft button roept `onToggleCollapse` aan
- `duration-150` (3x) wordt `duration-200`

### Dashboard.tsx:
- Regel 53: `sm:grid-cols-2` wordt `sm:grid-cols-2 lg:grid-cols-3`

### App.tsx:
- Reserveringen route wrapper krijgt `fullBleed` prop

