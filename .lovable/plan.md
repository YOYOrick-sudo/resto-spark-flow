# R3 Bug Fixes — Diagnose-output + migratie-keuze

## Q1 — Trigger op `factuur_regels`
```
trg_validate_factuur_regels
  BEFORE INSERT OR UPDATE
  EXECUTE FUNCTION validate_factuur_regels_status()
```

## Q2 — Check constraints
**Geen** check constraints op `factuur_regels`. De validatie zit volledig in de trigger.

## Q3 — Bestaande waardes
**0 rijen** in `factuur_regels` (insert wordt geblokkeerd door trigger). Veilig om te wijzigen.

## Q4 — Trigger function source
```sql
BEGIN
  IF NEW.match_status NOT IN ('gematcht', 'niet_gematcht', 'handmatig', 'overgeslagen') THEN
    RAISE EXCEPTION 'Invalid match_status: %', NEW.match_status;
  END IF;
  RETURN NEW;
END;
```

→ **Hardcoded NL-lijst in trigger function**. Code is al EN (matched/manual/unmatched). Trigger is de enige blokkade.

## Bonus — UI status mapping
`factuur_uploads.status` distinct in DB: `'verwerken'`, `'goedgekeurd'`
`STATUS_BADGES` (FactuurDetailPanel + FacturenTab) accepteert: `verwerken`, `review`, `goedgekeurd`, `afgewezen`
`STATUS_OPTIONS` dropdown: `review`, `goedgekeurd`, `afgewezen`

→ **Na succesvolle parse moet status = `'review'`** (niet 'wacht_op_review' of 'ai_completed' — die kent de UI niet).

---

## Migratie-keuze: **Scenario B** (trigger-rewrite)

Geen check constraint dus alleen de trigger function aanpassen. Code blijft op EN-canon.

### Migratie A — Update trigger function naar EN
```sql
CREATE OR REPLACE FUNCTION public.validate_factuur_regels_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.match_status NOT IN ('matched', 'manual', 'unmatched', 'skipped') THEN
    RAISE EXCEPTION 'Invalid match_status: %. Allowed: matched, manual, unmatched, skipped', NEW.match_status;
  END IF;
  RETURN NEW;
END;
$$;
```

Optioneel als alternatief: trigger droppen en CHECK constraint gebruiken (immutable, simpeler). Maar trigger-update is de minimale wijziging.

---

## Volledig fix-plan (volgorde)

### Stap 1 — DB migratie
Update `validate_factuur_regels_status()` naar EN-waardes (zie SQL hierboven).

### Stap 2 — `parse-factuur/index.ts`: status update
Na succesvolle parse: voeg `status: 'review'` toe aan de update-call (regel ~263).
```ts
.update({
  status: 'review',                    // ← TOEGEVOEGD (was: niet gezet, bleef 'verwerken')
  ai_parsing_status: "completed",
  ai_parsed_at: new Date().toISOString(),
  ...
})
```

### Stap 3 — `_shared/ai.ts`: timeout verhogen
- Voeg `timeoutMs?: number` toe aan `BaseAIOptions` (default 30000)
- Update `callGateway` om `timeoutMs` te gebruiken in de AbortController setTimeout
- In `parse-factuur/index.ts`: zet `timeoutMs: 60000` in de callAI options
- **Pro blijft primary**, Flash blijft fallback

### Stap 4 — Reprocess Kooyman (NIET de upload-row deleten)
```sql
-- Behoud factuur_uploads row voor traceability
DELETE FROM factuur_regels WHERE factuur_id = '<kooyman-id>';
UPDATE factuur_uploads
  SET ai_parsing_status = 'pending', status = 'verwerken',
      ai_parsed_at = NULL, ai_raw_response = NULL
  WHERE id = '<kooyman-id>';
-- Daarna: invoke parse-factuur via UI of supabase.functions.invoke
```

### Stap 5 — Verify
```sql
SELECT status, ai_parsing_status, ai_confidence_overall FROM factuur_uploads WHERE id = '<kooyman-id>';
SELECT match_status, COUNT(*) FROM factuur_regels WHERE factuur_id = '<kooyman-id>' GROUP BY match_status;
```
Verwacht: status='review', ai_parsing_status='completed', regels_count > 0 met mix van matched/unmatched.

### Stap 6 — PDF preview (apart, na hoofd-fixes)
`FactuurDetailPanel.tsx` `FactuurPreview` component: gebruik `<iframe>` voor `.pdf` met signed URL, `<img>` voor afbeeldingen.

---

## Bestanden

| Bestand | Wijziging |
|---|---|
| Migration | `CREATE OR REPLACE FUNCTION validate_factuur_regels_status()` met EN-waardes |
| `supabase/functions/_shared/ai.ts` | + `timeoutMs?` in BaseAIOptions, gebruik in setTimeout |
| `supabase/functions/parse-factuur/index.ts` | + `status: 'review'` na parse, + `timeoutMs: 60000` in callAI |
| `src/components/inkoop/FactuurDetailPanel.tsx` (stap 6) | iframe voor PDF preview |

## Wat we NIET doen
- Geen code-rollback naar NL match_status
- Geen model-switch naar Flash als primary
- Geen DELETE van `factuur_uploads` rij (alleen regels + status reset)
