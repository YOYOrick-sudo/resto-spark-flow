// supabase/functions/_shared/factuur-v2/validator.test.ts
// Deno-test voor validateFactuur — 3 cases: valid, warning, invalid.
//
// Run: deno test supabase/functions/_shared/factuur-v2/validator.test.ts

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { validateFactuur } from "./validator.ts";
import type { FactuurV2Output } from "./types.ts";

Deno.test("validator: valid factuur — alle math klopt", () => {
  const data: FactuurV2Output = {
    extractie_status: "success",
    leverancier_naam: "Bidfood",
    leverancier_btw_nummer: "NL123456789B01",
    factuur_nummer: "F-001",
    factuur_datum: "2025-06-24",
    subtotaal_excl_btw: 100.00,
    btw_regels: [{ percentage: 9, basis_bedrag: 100.00, btw_bedrag: 9.00 }],
    totaal_incl_btw: 109.00,
    regels: [
      {
        product_naam: "Olijfolie 5L",
        verpakking_eenheid: "L",
        verpakking_hoeveelheid: 5,
        hoeveelheid_besteld: 2,
        prijs_per_besteld_item: 50.00,
        prijs_per_basiseenheid: 10.00,
        prijs_totaal: 100.00,
        btw_percentage: 9,
        is_emballage: false,
        is_credit: false,
        confidence: "hoog",
      },
    ],
  };
  const result = validateFactuur(data);
  assertEquals(result.status, "valid");
  assertEquals(result.errors.length, 0);
  assertEquals(result.warnings.length, 0);
});

Deno.test("validator: warning factuur — regel-math off-by-cent", () => {
  const data: FactuurV2Output = {
    extractie_status: "success",
    leverancier_naam: "Kooyman",
    factuur_nummer: "K-002",
    factuur_datum: "2025-06-25",
    subtotaal_excl_btw: 100.00,
    btw_regels: [{ percentage: 21, basis_bedrag: 100.00, btw_bedrag: 21.00 }],
    totaal_incl_btw: 121.00,
    regels: [
      {
        product_naam: "Bier krat 24×33cl",
        verpakking_eenheid: "stuk",
        verpakking_hoeveelheid: 24,
        hoeveelheid_besteld: 4,
        prijs_per_besteld_item: 25.00,
        // 4 × 25.00 = 100.00, maar we zeggen 100.05 → 5 cent off → warning
        prijs_totaal: 100.05,
        btw_percentage: 21,
        is_emballage: false,
        is_credit: false,
        confidence: "medium",
      },
    ],
  };
  const result = validateFactuur(data);
  assertEquals(result.status, "warning");
  assertEquals(result.errors.length, 0);
  assertEquals(result.warnings.length >= 1, true);
});

Deno.test("validator: invalid factuur — totaal klopt niet", () => {
  const data: FactuurV2Output = {
    extractie_status: "success",
    leverancier_naam: "Hanos",
    factuur_nummer: "H-003",
    factuur_datum: "2025-06-26",
    subtotaal_excl_btw: 100.00,
    btw_regels: [{ percentage: 9, basis_bedrag: 100.00, btw_bedrag: 9.00 }],
    // verwacht 109.00, factuur zegt 200.00 → ERROR
    totaal_incl_btw: 200.00,
    regels: [
      {
        product_naam: "Tomaten",
        verpakking_eenheid: "kg",
        verpakking_hoeveelheid: 5,
        hoeveelheid_besteld: 1,
        prijs_per_besteld_item: 100.00,
        prijs_per_basiseenheid: 20.00,
        prijs_totaal: 100.00,
        btw_percentage: 9,
        is_emballage: false,
        is_credit: false,
        confidence: "hoog",
      },
    ],
  };
  const result = validateFactuur(data);
  assertEquals(result.status, "invalid");
  assertEquals(result.errors.length >= 1, true);
});
