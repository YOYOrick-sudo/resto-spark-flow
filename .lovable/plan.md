

## ✅ Verificatie-output (3 checks)

**Check 1 — `similarity()` namespace:**
```
similarity('test','tast')              → ❌ function does not exist
extensions.similarity('test','tast')   → ✅ 0.25
```
→ Alleen `extensions.similarity()` werkt. `fuzzy_match_leverancier()` heeft `extensions.similarity` al — **correct**, geen wijziging nodig. Wel nuttig: `search_path = public, extensions` toevoegen zodat de functie-body explicieter is en toekomstige calls zonder schema-prefix ook werken.

**Check 2 — `match_status` taalmismatch:**
- `parse-factuur` schrijft: `"matched"` / `"unmatched"` (Engels)
- `useFactuurMutations.matchRegel` schrijft: `"handmatig"` (NL)
- `goedkeuren` filtert op: `"gematcht" || "handmatig"` (NL) ← **filtert AI-rijen weg!**
- `FactuurRegelForm` schrijft: `"handmatig"` / `"niet_gematcht"` (NL)
- `FactuurDetailPanel` checkt: `"niet_gematcht"` (NL)
- DB row count per status: **0 rijen** (geen historische data → safe om te standaardiseren)

→ Standaardiseer op **Engels**: `matched` / `manual` / `unmatched`. Geen DB-migratie nodig (kolom is `text`, geen check constraint, geen historische data).

**Check 3 — `ingredienten` kolommen:**
```
kostprijs                       → ✅ numeric
kostprijs_bron                  → ✅ varchar
kostprijs_laatst_bijgewerkt     → ✅ timestamptz
```
→ Alle 3 bestaan. Geen ALTER nodig.

---

## 🔧 Fixes (1 DB-migratie + 4 file edits)

### Fix A — Migration: `search_path` aanvullen
```sql
CREATE OR REPLACE FUNCTION public.fuzzy_match_leverancier(p_location_id uuid, p_naam text)
RETURNS TABLE (id uuid, naam text, similarity real)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions   -- ← toegevoegd
AS $$
  SELECT l.id, l.naam, extensions.similarity(LOWER(l.naam), LOWER(p_naam))
  FROM leveranciers l
  WHERE l.location_id = p_location_id
    AND l.is_actief = true
    AND extensions.similarity(LOWER(l.naam), LOWER(p_naam)) > 0.3
  ORDER BY 3 DESC LIMIT 5;
$$;
```

### Fix B — `parse-factuur/index.ts` regel 266
Geen wijziging nodig (`"matched"` / `"unmatched"` is al het Engelse target).

### Fix C — `src/hooks/useFactuurMutations.ts`
- regel 146: `match_status: "handmatig"` → `match_status: "manual"`
- regel 179: `r.match_status === "gematcht" || r.match_status === "handmatig"` → `r.match_status === "matched" || r.match_status === "manual"`

### Fix D — `src/components/inkoop/FactuurRegelForm.tsx` regel 43
`ingredientId ? "handmatig" : "niet_gematcht"` → `ingredientId ? "manual" : "unmatched"`

### Fix E — `src/components/inkoop/FactuurDetailPanel.tsx` regels 236 + 272
`r.match_status === "niet_gematcht"` (2×) → `r.match_status === "unmatched"`

---

## 📋 Taal-canon (vastleggen)
| Status | Betekenis |
|---|---|
| `matched` | AI vond exact/alias match in `ingredienten` |
| `manual` | User koppelde handmatig via UI |
| `unmatched` | Geen koppeling — wacht op user-actie |

→ Op te nemen in `mem://features/invoice-processing-logic` na livegang.

---

## 🚀 Volgorde
1. DB-migratie A (functie-update met `search_path`)
2. Edge function geen wijziging
3. 3 file-edits (C, D, E) — pure string-replace
4. Smoke test: upload factuur → check dat `goedkeuren` nu prijzen daadwerkelijk pusht naar `ingredienten`

