

# Reserveringen: titel terug + meer ademruimte

## Wat er mis is

Vergeleken met jouw referentie-screenshot is de huidige versie te krap:

| Element | Nu | Gewenst (jouw screenshot) |
|---------|-----|---------------------------|
| Pagina titel | Ontbreekt | "Reserveringen" titel bovenaan |
| Ruimte toolbar - filters | Geen gap | Duidelijke verticale ruimte (pt-4) |
| Ruimte filters - content | pt-2 (minimaal) | Meer ademruimte (pt-4) |
| Lijst rij padding | py-1.5 (compact) | Ruimer: py-3 (compact) / py-4 (comfortable) |
| Status badges | Klein (text-caption, px-1.5) | Groter: text-xs, px-2.5 py-1 |
| Timeslot headers | py-1 (compact) | Ruimer: py-2 |

## Wijzigingen

### 1. `src/pages/Reserveringen.tsx`
- Titel "Reserveringen" terugzetten bovenaan (als h1, zonder PageHeader border -- gewoon een simpele titel)
- Toolbar krijgt `pt-4` spacing onder de titel
- Filters krijgen `pt-3` voor meer ruimte
- Content area krijgt `pt-4` in plaats van `pt-2`

### 2. `src/components/reserveringen/ReservationListView.tsx`
- Rij padding verhogen: compact van `py-1.5` naar `py-3`, comfortable van `py-3` naar `py-4`
- Status badges vergroten: compact krijgt `text-xs px-2.5 py-1` (nu `text-caption px-1.5 py-0`)
- Status dot iets groter in compact mode
- Timeslot headers: compact van `py-1` naar `py-2`
- Divider tussen rijen iets duidelijker

### 3. `src/components/reserveringen/ReservationFilters.tsx`
- Filter dropdowns iets breder (status 160px, shift 160px, type 200px)
- Gap tussen filters van `gap-2` naar `gap-3`

Dit herstelt de ruimtelijke, enterprise-achtige uitstraling van je referentie zonder de functionaliteit te wijzigen.
