

# Plan: Drie MEP Fixes + Totale Output

## Samenvatting

Vier wijzigingen: (1) gedeelde `mepDisplay.ts` helper voor eenheid-formatting, (2) SQL migratie om bestaande `visuele_eenheid` data op te schonen, (3) weekview eenheid-info tonen, (4) totale output weergave ("3× GN1/3 · 4.5 kg totaal").

**Lijstview:** al verwijderd — `MepTaken.tsx` heeft alleen `categorie` en `week` toggles.

**Wizard validatie:** niet nodig — er is geen user-facing input voor `visuele_eenheid`. Het veld wordt programmatisch gezet en de wizard (`ReceptStapMethodes.tsx`) stript al leading nummers op regel 58-59.

---

## Wijzigingen

### 1. Nieuw bestand: `src/utils/mepDisplay.ts`

Gedeelde helpers die de `^1\s+` strip-logica, fallback-keten, en totaalberekening centraliseren:

```typescript
export function getDisplayEenheid(task): string | null
// Fallback: visuele_eenheid → output_hoeveelheid+eenheid → target_eenheid

export function formatTaskAmount(task): string | null
// "3× GN1/3"

export function formatTaskTotal(task): string | null
// "4.5 kg totaal"
```

### 2. Bestaande componenten refactoren

| Component | Was | Wordt |
|-----------|-----|-------|
| `MepTaskRow.tsx` r.74-84 | Inline IIFE met `replace(/^1\s+/, '')` | `formatTaskAmount(task)` + `formatTaskTotal(task)` |
| `MepTaskList.tsx` r.163-166 | Rauw `task.methode.visuele_eenheid` | `formatTaskAmount(task)` |
| `MepWeekView.tsx` r.127-131 | Alleen `{task.units}×` | `formatTaskAmount(task)` met eenheid |
| `MepCompletionModal.tsx` r.34-36 | Inline strip-logica | `getDisplayEenheid(task)` |

### 3. SQL migratie: bestaande data opschonen

```sql
UPDATE halffabricaat_methodes 
SET visuele_eenheid = REGEXP_REPLACE(visuele_eenheid, '^1\s+', '') 
WHERE visuele_eenheid ~ '^1\s+';
```

### 4. Verwacht resultaat

- **MepTaskRow:** "3× GN1/3 · 4.5 kg totaal" — kok ziet direct hoeveel er geproduceerd wordt
- **MepTaskList:** "3× GN1/3" i.p.v. "3× 1 GN 1/3"
- **MepWeekView:** "3× GN1/3" i.p.v. alleen "3×"
- **Database:** geen `visuele_eenheid` records meer met leading "1 "

---

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/utils/mepDisplay.ts` | **Nieuw** — getDisplayEenheid, formatTaskAmount, formatTaskTotal |
| `src/components/mep/MepTaskRow.tsx` | Refactor → helper + totaal |
| `src/components/mep/MepTaskList.tsx` | Refactor → helper |
| `src/components/mep/MepWeekView.tsx` | Eenheid in badge |
| `src/components/mep/MepCompletionModal.tsx` | Refactor → helper |
| SQL migratie | Strip `^1\s+` uit bestaande visuele_eenheid |

