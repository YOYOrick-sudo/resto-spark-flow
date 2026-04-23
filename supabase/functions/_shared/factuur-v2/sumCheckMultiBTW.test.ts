// supabase/functions/_shared/factuur-v2/sumCheckMultiBTW.test.ts
// Sprint Multi-BTW + Emballage — DEEL 3 — unit tests.
//
// 4 scenario's:
//   1. Single-BTW (alle 9%) — Boer & Chef-pattern
//   2. Multi-BTW (food 9 + non-food 21) — Hanos-pattern
//   3. Met emballage (Bidfood-pattern) — A_subtotaal_zonder_emballage moet slagen
//   4. Echte mismatch — passed=false, strategy='geen_match'

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sumCheckMultiBTW } from "./sumCheckMultiBTW.ts";
import type { FactuurV2Regel } from "./types.ts";

function regel(overrides: Partial<FactuurV2Regel>): FactuurV2Regel {
  return {
    product_naam: "Test product",
    verpakking_eenheid: "stuk",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// SCENARIO 1: Single-BTW 9% (Boer & Chef-pattern)
// ---------------------------------------------------------------------------
Deno.test("Strategie A — single-BTW 9%, alleen producten", () => {
  const regels = [
    regel({ product_naam: "Tomaten", btw_percentage: 9, prijs_totaal: 25.00 }),
    regel({ product_naam: "Komkommer", btw_percentage: 9, prijs_totaal: 15.50 }),
    regel({ product_naam: "Sla", btw_percentage: 9, prijs_totaal: 9.50 }),
  ];
  const result = sumCheckMultiBTW(regels, {
    subtotaal_excl_btw: 50.00,
    btw_bedrag: 4.50,
    totaal_incl_btw: 54.50,
    btw_regels: [
      { percentage: 9, basis_bedrag: 50.00, btw_bedrag: 4.50 },
    ],
  });
  assertEquals(result.passed, true);
  assertEquals(result.strategy, "A_expliciet_subtotaal");
  assertEquals(result.details.totaal_regels_emballage, 0);
});

// ---------------------------------------------------------------------------
// SCENARIO 2: Multi-BTW 9 + 21 (Hanos-pattern, geen emballage)
// ---------------------------------------------------------------------------
Deno.test("Strategie A — multi-BTW (food 9 + non-food 21), geen emballage", () => {
  const regels = [
    regel({ product_naam: "Bloemkool", btw_percentage: 9, prijs_totaal: 100.00 }),
    regel({ product_naam: "Wijn", btw_percentage: 21, prijs_totaal: 200.00 }),
  ];
  const result = sumCheckMultiBTW(regels, {
    subtotaal_excl_btw: 300.00,
    btw_bedrag: 51.00,
    totaal_incl_btw: 351.00,
    btw_regels: [
      { percentage: 9, basis_bedrag: 100.00, btw_bedrag: 9.00 },
      { percentage: 21, basis_bedrag: 200.00, btw_bedrag: 42.00 },
    ],
  });
  assertEquals(result.passed, true);
  // A1 slaagt eerst — geen emballage dus geen A2 nodig.
  assertEquals(result.strategy, "A_expliciet_subtotaal");
  assertEquals(result.details.n_btw_tarieven, 2);
});

// ---------------------------------------------------------------------------
// SCENARIO 3: Bidfood-pattern — emballage telt apart in subtotaal
// ---------------------------------------------------------------------------
Deno.test("Strategie A2 — Bidfood-pattern: subtotaal zonder emballage", () => {
  const regels = [
    // 6 product-regels = €194,27
    regel({ product_naam: "FRITZ KOLA", btw_percentage: 9, prijs_totaal: 40.70 }),
    regel({ product_naam: "ALPRO COCONUT BARISTA", btw_percentage: 9, prijs_totaal: 51.80 }),
    regel({ product_naam: "ARLA MELK VOL", btw_percentage: 9, prijs_totaal: 22.80 }),
    regel({ product_naam: "KAMEYA WASABI", btw_percentage: 9, prijs_totaal: 37.55 }),
    regel({ product_naam: "RIO SCHOONMAAKAZIJN", btw_percentage: 21, prijs_totaal: 9.61 }),
    regel({ product_naam: "ESCALI KEUKENWEEGSCH.", btw_percentage: 21, prijs_totaal: 31.81 }),
    // 3 emballage-regels = €227,50
    regel({ product_naam: "BIDFOOD FUST", btw_percentage: 0, is_emballage: true, prijs_totaal: 112.50 }),
    regel({ product_naam: "ROLCONTAINER", btw_percentage: 0, is_emballage: true, prijs_totaal: 100.00 }),
    regel({ product_naam: "TUSSENLEGGER", btw_percentage: 0, is_emballage: true, prijs_totaal: 15.00 }),
  ];
  // Bidfood echte cijfers: subtotaal_excl_btw=341,76 — past niet bij som-product (194,27)
  // ÉN niet bij som-totaal (421,77). Echte factuur heeft eigen rekenwijze.
  // Voor de TEST gebruiken we subtotaal=194,27 zodat A2 (zonder emballage) slaagt.
  const result = sumCheckMultiBTW(regels, {
    subtotaal_excl_btw: 194.27,
    btw_bedrag: 22.45,
    totaal_incl_btw: 444.22, // 194,27 + 22,45 BTW + 227,50 emballage
    btw_regels: [
      { percentage: 9, basis_bedrag: 152.85, btw_bedrag: 13.76 },
      { percentage: 21, basis_bedrag: 41.42, btw_bedrag: 8.70 },
    ],
  });
  assertEquals(result.passed, true);
  // A1 faalt (somTotaal=421,77 ≠ 194,27), A2 slaagt (somProduct=194,27 ≈ 194,27).
  assertEquals(result.strategy, "A_subtotaal_zonder_emballage");
  assertEquals(result.details.totaal_regels_emballage, 227.50);
});

// ---------------------------------------------------------------------------
// SCENARIO 4: Echte mismatch — geen strategie slaagt
// ---------------------------------------------------------------------------
Deno.test("Geen match — echte mismatch faalt op alle 3 strategieën", () => {
  const regels = [
    regel({ product_naam: "Product A", btw_percentage: 9, prijs_totaal: 100.00 }),
    regel({ product_naam: "Product B", btw_percentage: 9, prijs_totaal: 50.00 }),
  ];
  const result = sumCheckMultiBTW(regels, {
    subtotaal_excl_btw: 200.00, // som=150 vs subtotaal=200 → 50ct te ver
    btw_bedrag: 18.00,
    totaal_incl_btw: 218.00, // ook geen 9% of 21% match met 150
    btw_regels: [
      { percentage: 9, basis_bedrag: 200.00, btw_bedrag: 18.00 },
      // Strategie B faalt: 150×9% = 13,50 ≠ 18,00 (verschil €4,50 > tolerantie)
    ],
  });
  assertEquals(result.passed, false);
  assertEquals(result.strategy, "geen_match");
});

// ---------------------------------------------------------------------------
// EXTRA: Strategie C — uniforme 9% inferentie (alleen totaal_incl_btw bekend)
// ---------------------------------------------------------------------------
Deno.test("Strategie C — uniforme 9% inferentie", () => {
  const regels = [
    regel({ product_naam: "Brood", btw_percentage: 9, prijs_totaal: 100.00 }),
  ];
  const result = sumCheckMultiBTW(regels, {
    subtotaal_excl_btw: null,
    btw_bedrag: null,
    totaal_incl_btw: 109.00,
    btw_regels: [],
  });
  assertEquals(result.passed, true);
  assertEquals(result.strategy, "C_uniforme_9pct_inferentie");
});
