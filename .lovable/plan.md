# Sprint: Pakbon-boeking — pakbon-hoeveelheid leidend

Status: plan + correctie verwerkt, **wacht op build-mode**.

---

## Stap 0 — Bevindingen

**0a. Boeking-math** (`supabase/functions/confirm-goods-receipt/index.ts` r. 384–454):

```ts
const aantalVerpakkingen = inputLine.hoeveelheid_ontvangen
  ?? dbLine.hoeveelheid_verwacht ?? 1;                  // = 3 voor Rucola
const totalInPackagingUnit =
  Number(la.verpakking_hoeveelheid) * Number(aantalVerpakkingen);
const deltaBase = toBaseUnit(totalInPackagingUnit,
                             la.verpakking_eenheid, ingredient);
// identity-LA: 1 × 3 → +3 st ❌
```

Identity-LA komt door dit pad omdat r. 362 alleen blokkeert wanneer chef noch `accept_ai_factor` noch `manual_factor` stuurt. Bij impliciete bevestiging promoot r. 376–382 de LA naar `ai_confirmed` op factor 1 × stuks.

**0b. Twijfelzone-interactie** (r. 187–209):
- Pre-RPC guard blokkeert bevestigen alleen op `match_status='needs_confirmation'` (ingredient-match, Komkommer-koppeling).
- Er is **geen** factor-conflict-detectie in `confirm-goods-receipt`. Wij dupliceren niets — we voegen factor-conflict toe als nieuwe tak C.
- Tolerantie: ±2% (sync met `factorsEquivalent` in `src/lib/unitBridge.ts`).

**0c. AI-velden — betrouwbaarheid bevestigd op live data:**

| product | per_pkg_qty | pkg_unit | total_qty | total_unit |
|---|---|---|---|---|
| Rucola gewassen 250 gr | 0,25 | kg | 0,75 | kg |
| Winterpeen kist 20 kg | 20 | kg | 20 | kg |
| Gember kg | _null_ | kg | 2,38 | kg |
| Tauge kg | _null_ | kg | 3,14 | kg |

→ `ai_total_received_quantity/_unit` is overal gevuld en de canonieke "wat is fysiek geleverd"-bron. `ai_per_package_quantity` alleen als de pakbon dat expliciet meldde.

**0d. UI-prefill bug** (`LineFactorPanel.tsx` r. 72–77): `display_factor` valt terug op `la_factor=1` + `ingredient_base_unit="kg"` → "1 kg" Gember. Tauge: LA factor `null` → display leeg, maar de manual-vraag wordt nog wél getoond.

---

## Plan (4 wijzigingen)

### 1. Edge function — 4-takken-boeking
`supabase/functions/confirm-goods-receipt/index.ts`, tussen 3a (manual_factor) en 3b (la-check).

Helpers boven `Deno.serve`:
```ts
function isUnconfirmedLA(la): boolean {
  return !la || la.factor_source === "unknown"
      || la.verpakking_hoeveelheid == null || !la.verpakking_eenheid;
}
const FACTOR_CONFLICT_TOLERANCE = 0.02;
```

Per-regel logica (vóór bestaande 3d):

| Tak | Conditie | Actie |
|---|---|---|
| A | `ai_total_received_quantity` aanwezig **en** `isUnconfirmedLA(la)` **en** niet weighted | `deltaBase = toBaseUnit(ai_total_received_quantity, ai_total_received_unit, ingredient)`. **Geen** LA-promotie. |
| B | echte LA + pakbon-totaal matcht (±2%) | bestaand path: `la.factor × aantal → toBaseUnit` |
| C | echte LA + pakbon-totaal botst | `factorErrors.push({ reason: "factor_conflict_pakbon_vs_la" })` → 422 |
| D | geen pakbon-totaal | bestaand path (ongewijzigd) |

NULL-veiligheid: faalt `toBaseUnit` in tak A op ontbrekende `wpp`/`density`, dan `factor_required` met `missing_conversion` — geen crash, geen stille onderboeking.

### 2. UI-prefill — alleen echte AI-data
`src/hooks/useGoodsReceiptDetail.ts` `computeFactorContext`:

**Geen totaal/aantal-deling.** Prefill komt uitsluitend uit `ai_per_package_quantity` + `ai_package_unit`:
```ts
const prefill_amount = line.ai_per_package_quantity ?? null;
const prefill_unit   = line.ai_package_unit ?? null;
```

Nieuwe afgeleide vlag:
```ts
const pakbon_total_authoritative =
  hasPakbonTotal && (la == null || la_source === "unknown");
```

Mode-aanpassing voor pakbon-authoritative regels:
- `pakbon_total_authoritative && ai_factor == null` → **mode = CONFIRMED**, géén factor-vraag (Gember, Tauge: pakbon-totaal boekt het, "hoeveel per verpakking" is betekenisloos voor los-gewogen).
- `pakbon_total_authoritative && ai_factor != null` → mode = AI_SUGGESTED, prefill toont "0,25 kg" (Rucola).

`LineFactorPanel.tsx`: draftAmount/draftUnit initialiseren uit `ctx.prefill_amount`/`ctx.prefill_unit` — **nooit** uit `la_factor` of `ingredient_base_unit`. Leeg als geen prefill bekend is.

### 3. Conflict-banner-tekst
`src/pages/leveringen/LeveringDetail.tsx` r. 678–687: humaniseer `factor_conflict_pakbon_vs_la` als "Jullie instelling botst met de pakbon. Open de regel en bevestig de juiste factor."

### 4. Type-uitbreiding
`LineFactorContext` krijgt: `prefill_amount`, `prefill_unit`, `pakbon_total_qty`, `pakbon_total_unit`, `pakbon_total_authoritative`.

---

## Verificatie

| ID | Geval | Verwacht | Bewijs |
|---|---|---|---|
| V1 | Rucola, identity-LA, wpp=75, pakbon 0,75 kg | +10 st (tak A), LA niet gepromoot | SQL voor/na `voorraad_bewegingen` + `ingredienten.voorraad` |
| V2 | Winterpeen, echte LA doos 20 kg, wpp=200 | +100 st (tak B, ongewijzigd) | SQL voor/na |
| V3 | Komkommer-achtig: LA=36 st/kist, pakbon=30 st | 422 `factor_conflict_pakbon_vs_la` → twijfelvraag | Screenshot |
| V4 | Identity-LA + kg-pakbon zonder wpp (Dille bos) | `factor_required` `missing_conversion`, geen crash | Screenshot + schone console |
| V5 | Bevestig-UI | Rucola toont "1 verpakking = 0,25 kg". **Gember/Tauge tonen geen factor-vraag** (mode=CONFIRMED, pakbon-totaal leidend). | Screenshot |

---

## Out-of-scope
- ❌ Eenheid-migratie van de 12 (kg-display) — fix 3
- ❌ Non-food filter — fix 2
- ❌ Uien/Lunchbox-duplicaten
- ❌ `complete_mep_task` / `process_waste_registratie`

## Security
- `confirm_goods_receipt` RPC: SECURITY DEFINER + role-check intact.
- `auth.uid()`-guard intact.
- Geen nieuwe publieke endpoints.
- Boeking blijft atomair.
