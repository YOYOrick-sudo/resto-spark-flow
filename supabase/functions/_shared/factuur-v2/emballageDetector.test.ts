// supabase/functions/_shared/factuur-v2/emballageDetector.test.ts
// Sprint Multi-BTW + Emballage — DEEL 1 — Stop-gate 1.
//
// 10 test-regels die het volledige spectrum dekken:
//   - 4× duidelijke emballage (Bidfood-pattern + statiegeld)
//   - 6× duidelijke producten (food + non-food + grensgevallen)
//
// Run: deno test supabase/functions/_shared/factuur-v2/emballageDetector.test.ts
//
// Verwacht: 10/10 groen.

import {
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isEmballageRegel } from "./emballageDetector.ts";
import type { FactuurV2Regel } from "./types.ts";

/**
 * Helper: bouw een minimale FactuurV2Regel met sensible defaults.
 */
function regel(overrides: Partial<FactuurV2Regel>): FactuurV2Regel {
  return {
    product_naam: "Onbekend product",
    verpakking_eenheid: "stuk",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// EMBALLAGE-CASES (verwacht: isEmballage=true)
// ---------------------------------------------------------------------------

Deno.test("Bidfood Fust → emballage (keyword + AI-flag, hoog)", () => {
  const result = isEmballageRegel(
    regel({
      product_naam: "Bidfood Fust",
      is_emballage: true,
      btw_percentage: 0,
      prijs_per_besteld_item: 22.50,
      prijs_totaal: 112.50,
    }),
  );
  assertEquals(result.isEmballage, true);
  assertEquals(result.confidence, "hoog");
  // Verwacht 2 signalen: AI + keyword (prijs is buiten statiegeld-range).
  assertEquals(result.detectedBy.includes("ai_extractie"), true);
  assertEquals(result.detectedBy.includes("keyword_match"), true);
});

Deno.test("Rolcontainer → emballage (keyword-match, medium)", () => {
  const result = isEmballageRegel(
    regel({
      product_naam: "Rolcontainer leeg",
      is_emballage: false, // AI heeft het gemist
      btw_percentage: 21,
      prijs_per_besteld_item: 100.00,
      prijs_totaal: 100.00,
    }),
  );
  assertEquals(result.isEmballage, true);
  assertEquals(result.confidence, "medium");
  assertEquals(result.detectedBy, ["keyword_match"]);
});

Deno.test("Tussenlegger → emballage (keyword-match, medium)", () => {
  const result = isEmballageRegel(
    regel({
      product_naam: "Tussenlegger karton",
      btw_percentage: 9,
      prijs_per_besteld_item: 5.00,
      prijs_totaal: 15.00,
    }),
  );
  assertEquals(result.isEmballage, true);
  assertEquals(result.confidence, "medium");
  assertEquals(result.detectedBy, ["keyword_match"]);
});

Deno.test("Statiegeld flesjes → emballage (3 signalen, hoog)", () => {
  const result = isEmballageRegel(
    regel({
      product_naam: "Statiegeld 0,15",
      is_emballage: true,
      btw_percentage: 0,
      prijs_per_besteld_item: 0.15,
      prijs_totaal: 3.60,
    }),
  );
  assertEquals(result.isEmballage, true);
  assertEquals(result.confidence, "hoog");
  // Verwacht 3 signalen: AI + keyword + btw0-pattern.
  assertEquals(result.detectedBy.length, 3);
});

// ---------------------------------------------------------------------------
// PRODUCT-CASES (verwacht: isEmballage=false)
// ---------------------------------------------------------------------------

Deno.test("Bloemkool → geen emballage", () => {
  const result = isEmballageRegel(
    regel({
      product_naam: "Bloemkool per stuk",
      is_emballage: false,
      btw_percentage: 9,
      prijs_per_besteld_item: 1.85,
      prijs_totaal: 11.10,
    }),
  );
  assertEquals(result.isEmballage, false);
  assertEquals(result.confidence, "hoog");
  assertEquals(result.detectedBy, []);
});

Deno.test("Cola krat 24x33cl → geen emballage (krat = verpakking van product)", () => {
  // 'krat' staat NIET in de keyword-lijst (te ambigu, vaak product-verpakking).
  const result = isEmballageRegel(
    regel({
      product_naam: "Coca-Cola krat 24x33cl",
      is_emballage: false,
      btw_percentage: 9,
      prijs_per_besteld_item: 14.95,
      prijs_totaal: 14.95,
    }),
  );
  assertEquals(result.isEmballage, false);
  assertEquals(result.detectedBy, []);
});

Deno.test("Bier krat → geen emballage (product-verpakking)", () => {
  const result = isEmballageRegel(
    regel({
      product_naam: "Heineken krat 24x30cl",
      is_emballage: false,
      btw_percentage: 9,
      prijs_per_besteld_item: 18.50,
      prijs_totaal: 37.00,
    }),
  );
  assertEquals(result.isEmballage, false);
  assertEquals(result.detectedBy, []);
});

Deno.test("Schoonmaakmiddel → geen emballage (non-food product)", () => {
  const result = isEmballageRegel(
    regel({
      product_naam: "Allesreiniger 5L",
      is_emballage: false,
      btw_percentage: 21,
      prijs_per_besteld_item: 12.95,
      prijs_totaal: 12.95,
    }),
  );
  assertEquals(result.isEmballage, false);
  assertEquals(result.detectedBy, []);
});

Deno.test("Olijfolie → geen emballage", () => {
  const result = isEmballageRegel(
    regel({
      product_naam: "Olijfolie Abril Pom 5L",
      is_emballage: false,
      btw_percentage: 9,
      prijs_per_besteld_item: 30.97,
      prijs_totaal: 30.97,
    }),
  );
  assertEquals(result.isEmballage, false);
  assertEquals(result.detectedBy, []);
});

Deno.test("Tomaten → geen emballage (food, ook als BTW=0 onbekend)", () => {
  const result = isEmballageRegel(
    regel({
      product_naam: "Tomaten trostros",
      is_emballage: false,
      btw_percentage: 9,
      prijs_per_besteld_item: 3.45,
      prijs_totaal: 17.25,
    }),
  );
  assertEquals(result.isEmballage, false);
  assertEquals(result.detectedBy, []);
});
