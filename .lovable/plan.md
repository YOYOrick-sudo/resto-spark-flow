

# Plan: Gerecht componenten — eenheid portie/gewicht + kostprijs fix

## Probleem
Bij halffabricaat selectie wordt `visuele_eenheid` (GN 1/3, soeppan) opgeslagen als eenheid. Moet "portie" zijn met dropdown voor g/kg/ml/L.

## Wijzigingen

### 1. `src/hooks/useHalffabricaatSearch.ts`
- Toevoegen `totale_kostprijs` aan `HalffabricaatSearchResult` interface (zit al in de query)

### 2. `src/hooks/useGerechtDetail.ts`
- Join `halffabricaat_methodes` via recepten zodat bestaande componenten portiegrootte kunnen tonen
- Extend `GerechtComponent` interface met `recept_methode_output?: number` en `recept_methode_eenheid?: string`
- Map deze velden uit de eerste methode (type "Bereiden" prioriteit)

Query wordt:
```typescript
recepten(
  naam, porties, totale_kostprijs,
  halffabricaat_methodes!halffabricaat_methodes_recept_id_fkey(
    output_hoeveelheid, output_eenheid, type
  )
)
```

### 3. `src/components/kaartbeheer/GerechtComponentenTab.tsx`

**AddHalffabricaat:**
- State toevoegen: `selectedEenheid` (default "portie"), `methodeData` (output_hoeveelheid, output_eenheid, porties, totale_kostprijs)
- Bij selectie: sla methode-data op, zet eenheid op "portie" (niet visuele_eenheid)
- Na selectie: toon eenheid `<select>` dropdown met opties: `portie (Xg)`, `g`, `kg`, `ml`, `L`
- Input step/min: portie → step=1, min=1; gewicht → step=0.5, min=0.1
- Toon geschatte kostprijs live: bij portie = `totale_kostprijs / porties × hoeveelheid`, bij gewicht = via output conversie
- handleAdd: stuurt gekozen eenheid door

**ComponentRow:**
- Kostprijs berekening eenheid-aware maken:
  - `eenheid === "portie"`: `hoeveelheid × (totale_kostprijs / porties)` (huidige logica, correct)
  - `eenheid === "g"/"kg"/"ml"/"L"`: `hoeveelheid × kostprijs_snapshot` (snapshot wordt per-eenheid opgeslagen)
- Toon portiegrootte label bij portie-eenheid als methode-data beschikbaar is

### 4. `src/hooks/useGerechtMutations.ts`
- `addComponent` voor halffabricaten: kostprijs_snapshot eenheid-aware
  - Bij "portie": snapshot = totale_kostprijs / porties (huidige logica)
  - Bij gewicht: fetch methode output, bereken kostprijs per eenheid van de gekozen eenheid

### 5. `src/pages/KaartbeheerDetail.tsx`
- Kostprijs `useMemo` (regel 53): halffabricaat reduce eenheid-aware
  - `eenheid === "portie"`: huidige formule
  - Anders: `hoeveelheid × kostprijs_snapshot`

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/hooks/useHalffabricaatSearch.ts` | `totale_kostprijs` aan interface |
| `src/hooks/useGerechtDetail.ts` | Join methode-data, extend interface |
| `src/components/kaartbeheer/GerechtComponentenTab.tsx` | Eenheid dropdown, portiegrootte, kostprijs per eenheid |
| `src/hooks/useGerechtMutations.ts` | Snapshot eenheid-aware |
| `src/pages/KaartbeheerDetail.tsx` | Kostprijs useMemo eenheid-aware |

Geen migraties. Geen nieuwe bestanden.

