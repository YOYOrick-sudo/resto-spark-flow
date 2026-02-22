

# Contacten pagina — Enterprise tabel compliance

## Probleem

De Contacten pagina en de onderliggende `NestoTable` component volgen niet de Enterprise Design Guide. Meerdere anti-patronen uit Sectie 8 en 13 van de guide worden geschonden.

## Gevonden schendingen

### NestoTable component (`src/components/polar/NestoTable.tsx`)

| Schending | Huidig | Correct (Enterprise Guide) |
|-----------|--------|---------------------------|
| Zebra striping | `zebra` prop, default `true` | Verboden — alleen `divide-y divide-border/50` |
| Header achtergrond | `bg-accent hover:bg-accent` | Geen achtergrond (zwevende headers) |
| Header tekst | `text-label text-muted-foreground` | `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider` |
| Header padding | `h-11 px-4` | `px-4 pb-2` (alleen onderaan ruimte) |
| Rij hover | `hover:bg-accent` | `hover:bg-muted/30 transition-colors duration-150` |
| Rij scheiding | `border-b border-border` per rij | `divide-y divide-border/50` op TableBody |
| Wrapper border | `border border-border` | Shadow-based (`shadow-card`) of `NestoCard` wrapper |

### ContactsPage (`src/pages/marketing/ContactsPage.tsx`)

| Schending | Huidig | Correct |
|-----------|--------|---------|
| Naam kolom | `font-medium` | `font-semibold text-foreground` (primaire data) |
| Numerieke kolommen | Geen `tabular-nums` | `tabular-nums` op bezoeken en besteding |
| Loading state | Raw `div` met `animate-pulse` | `TableSkeleton` component |
| Valuta format | Geen monospace alignment | `tabular-nums` class |

### TableSkeleton (`src/components/polar/LoadingStates.tsx`)

| Schending | Huidig | Correct |
|-----------|--------|---------|
| Header achtergrond | `bg-accent` | Geen achtergrond |
| Zebra striping | `rowIndex % 2 === 1 && "bg-accent/50"` | Geen zebra, alleen dividers |

## Wijzigingen

### 1. `src/components/polar/NestoTable.tsx`

Herschrijf de tabel styling naar enterprise standaard:
- Verwijder `zebra` prop (of maak default `false` en negeer)
- Header: geen achtergrondkleur, zwevende labels met `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider`
- Header padding: `px-4 pb-2`
- TableBody: `divide-y divide-border/50` in plaats van per-rij borders
- Rij hover: `hover:bg-muted/30 transition-colors duration-150`
- Wrapper: verwijder `border border-border`, gebruik `bg-card rounded-2xl shadow-card` of minimale container
- Cursor: `cursor-pointer` alleen bij `onRowClick`

### 2. `src/pages/marketing/ContactsPage.tsx`

- Naam kolom: `font-semibold text-foreground` in plaats van `font-medium`
- Bezoeken kolom: voeg `tabular-nums` toe aan className
- Gem. besteding kolom: voeg `tabular-nums` toe aan className
- Loading state: vervang raw div door `TableSkeleton` import uit LoadingStates
- Lege waarden: gebruik lege string i.p.v. `'—'` (enterprise guide: leeg laten)

### 3. `src/components/polar/LoadingStates.tsx` (TableSkeleton)

- Verwijder `bg-accent` van header row
- Verwijder zebra striping logica
- Gebruik `divide-y divide-border/50` voor rij scheiding

### 4. `src/components/polar/DataTable.tsx`

Dezelfde fixes als NestoTable voor consistentie:
- Header: zwevende labels, geen `bg-accent`
- Verwijder zebra default
- Rij hover: `hover:bg-muted/30`
- Wrapper: `bg-card shadow-card` zonder zware border

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/polar/NestoTable.tsx` | Edit — enterprise tabel styling |
| `src/components/polar/DataTable.tsx` | Edit — enterprise tabel styling |
| `src/components/polar/LoadingStates.tsx` | Edit — TableSkeleton fix |
| `src/pages/marketing/ContactsPage.tsx` | Edit — typografie, tabular-nums, skeleton |

