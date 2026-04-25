# Mini-sprint 2C-3 — Sender + PDF-content cross-verificatie leverancier

## Doel
Pakbon wordt aan correcte leverancier gekoppeld via combinatie van sender-domein
whitelist + AI-extractie van leverancier_naam uit PDF. Voorkomt mis-toewijzing
zoals huidig probleem (Boer & Chef PDF van shouf.ai → toegewezen aan Bidfood).

## Beslismatrix (definitief, b1/b2/b3 split)

| Scenario | Sender-matches | PDF-extractie | Actie | Warning |
|----------|----------------|---------------|-------|---------|
| **a**    | 1 match        | bevestigt sender | use sender | nee |
| **b1**   | 1 match        | match onbekend (PDF naam unmatched) | use sender | nee |
| **b2**   | 1 match        | matcht ANDERE bekende leverancier (HIGH-CONF) | **use PDF-match** | **JA** |
| **b3**   | 1 match        | matcht andere maar LOW-CONF | use sender | ja (zwak) |
| **c**    | meerdere       | matcht één van de kandidaten | use PDF-match | nee |
| **d**    | meerdere       | matcht geen | use eerste sender-match | ja |
| **e**    | 0 matches      | matcht bekende leverancier | use PDF-match | ja ("toegewezen via PDF") |
| **f**    | 0 matches      | matcht geen | reject (huidige fallback) | n.v.t. |

## High-confidence threshold (PDF-naam → leverancier)
HIT wanneer:
1. Exact normalized match (lowercase + strip "B.V."/"BV"/punct/whitespace), OF
2. Token-set overlap ≥ 80% (jaccard op woord-tokens), OF
3. Substring beide kanten (een naam zit in de andere)

Anders MISS. Hard threshold voorkomt fuzzy-chaos.

## Logging per pakbon
```
[leverancier-decision] receipt=<id> scenario=<a|b1|b2|b3|c|d|e|f>
  sender_matches=[id1,id2] sender_names=[X,Y]
  pdf_name="<naam>" pdf_match_id=<id|null> pdf_match_name=<X|null>
  chosen=<id> chosen_name=<X> warning=<true|false>
```

## Build-volgorde
1. DB-migration: `pakbon_email_intake.sender_match_leverancier_ids uuid[]`,
   `goods_receipts.leverancier_warning bool`, `leverancier_warning_reason text`
2. `receive-pakbon-email`: sender match → array (limit 10), geen hard reject,
   pass kandidaten door naar parse-pakbon
3. `parse-pakbon`: helpers + beslismatrix + logging + DB-update
4. View `goods_receipts_chef_inbox` aanvullen met warning-velden
5. `useGoodsReceipts` row-type aanvullen
6. `LeveringCard.tsx`: oranje "⚠ Check leverancier" pill
7. Detail-page: prominente warning-banner bovenaan
8. Cleanup-migration receipt 6f1914d6 → Boer & Chef
9. Deploy beide edge functions
10. Smoke-test 5 scenarios

## Niet in scope (Ronde 3)
- Concept-status voor scenario (f) ipv hard reject
- Manager-UI voor warning-pakbonnen review
- Auto-leerproces (sender_domain toevoegen na bevestigde PDF-match)
- Bulk-correctie tools
