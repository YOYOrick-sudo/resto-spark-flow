
# Deel 1 — Validator-Slim (uitvoeren)

Akkoord ontvangen op alle 4 deviaties. Ik ga Deel 1 nu volledig bouwen volgens het plan, met strikte stop-gate na verificatie.

## Wat ik ga doen (Deel 1)

1. **SQL migration** — `factuur_regels` uitbreiden met 3 kolommen (idempotent, IF NOT EXISTS):
   - `validation_corrected BOOLEAN DEFAULT false`
   - `validation_correction_path TEXT`
   - `validation_ambiguous BOOLEAN DEFAULT false`
   - Plus `COMMENT ON COLUMN` voor alle drie

2. **`supabase/functions/_shared/factuur-v2/types.ts`** (volledig) — `FactuurV2Regel` uitbreiden met de 3 nieuwe optionele velden.

3. **`supabase/functions/_shared/factuur-v2/validator.ts`** (volledig) — bestaande `markPerRegelValidationErrors()` vervangen door `validateAndCorrectLines()`:
   - CHECK 1: `hoeveelheid_besteld × prijs_per_besteld_item ≈ prijs_totaal`
   - CHECK 2: `hoeveelheid_besteld × verpakking_hoeveelheid × prijs_per_basiseenheid ≈ prijs_totaal` → fix `prijs_per_besteld_item`
   - CHECK 3: `verpakking_hoeveelheid × prijs_per_besteld_item ≈ prijs_totaal` → fix `hoeveelheid_besteld`
   - Tolerantie €0,02
   - Gate: 0 = error, 1 = auto-fix + corrected=true, 2+ = ambiguous=true (niet blokkeren)
   - `console.log` per auto-fix

4. **`supabase/functions/parse-factuur-v2/index.ts`** (volledig) — regelRows-mapping uitbreiden met de 3 nieuwe velden zodat ze daadwerkelijk in de DB landen.

5. **TypeScript build-check** via `npx tsc --noEmit` op shared types.

## Stop-gate verificatie (Deel 1)

Na deploy + migration:
- **Reset Boer & Chef factuur** (DELETE regels + reset uploads-velden via SQL).
- **Re-parse** triggeren via curl naar `parse-factuur-v2` met service role key (geen UI-afhankelijkheid).
- **SQL-output tonen**:
  ```sql
  SELECT COUNT(*) AS totaal,
         COUNT(*) FILTER (WHERE validation_error = true) AS errors,
         COUNT(*) FILTER (WHERE validation_corrected = true) AS auto_fixed,
         COUNT(*) FILTER (WHERE validation_ambiguous = true) AS ambiguous
  FROM factuur_regels WHERE factuur_id = '7e5ba86a-...';
  ```
  Verwacht: `totaal=60, errors=0, auto_fixed=5, ambiguous=0`
- **Factuur-status SQL**:
  ```sql
  SELECT status, ai_parsing_status, totaalbedrag, validation_retries,
         validation_blocked_reason, jsonb_array_length(validation_warnings) AS n_warn
  FROM factuur_uploads WHERE id = '7e5ba86a-...';
  ```
  Verwacht: `status='review'` (niet `review_blocked`), `ai_parsing_status='success'`, totaal ≈ €594
- **Edge-function logs**: eerste 20 regels van `parse-factuur-v2` met de `[validator] auto-fix path=…` regels zichtbaar.

Deel 2 en 3 wachten expliciet op jouw OK.

## Niet doen in deze ronde
- Geen wijziging aan extractor/prompt/AI-schema
- Geen wijziging aan frontend
- Geen RLS-wijzigingen (dat is Deel 2)
- Geen evaluate-signals-aanpassingen (dat is Deel 2)
- Geen fire-and-forget POST (dat is Deel 3)
