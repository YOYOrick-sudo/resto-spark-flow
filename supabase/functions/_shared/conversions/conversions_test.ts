// Deno tests voor _shared/conversions
// Run: supabase--test_edge_functions { functions: ["_shared"], pattern: "conversions" }
// Of:  deno test supabase/functions/_shared/conversions/

import {
  assertEquals,
  assertAlmostEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  convert,
  toBaseUnit,
  fromBaseUnit,
  MissingConversionError,
  UnknownUnitError,
  type Ingredient,
} from "./index.ts";

const aubergine: Ingredient = {
  base_unit: "st",
  weight_per_piece_g: 350,
  density_g_per_ml: 1.0,
};

const olijfolie: Ingredient = {
  base_unit: "ml",
  weight_per_piece_g: null,
  density_g_per_ml: 0.92,
};

const generiek: Ingredient = {
  base_unit: "g",
  weight_per_piece_g: null,
  density_g_per_ml: 1.0,
};

const stZonderGewicht: Ingredient = {
  base_unit: "st",
  weight_per_piece_g: null,
  density_g_per_ml: 1.0,
};

Deno.test("conversions: aubergine 2 st → kg = 0.7", () => {
  assertEquals(convert(2, "st", "kg", aubergine), 0.7);
});

Deno.test("conversions: aubergine 300 g → st ≈ 0.857", () => {
  assertAlmostEquals(convert(300, "g", "st", aubergine), 0.8571, 0.001);
});

Deno.test("conversions: aubergine 1 st → g = 350", () => {
  assertEquals(convert(1, "st", "g", aubergine), 350);
});

Deno.test("conversions: olijfolie 1 el → g = 13.8 (15ml * 0.92)", () => {
  assertAlmostEquals(convert(1, "el", "g", olijfolie), 13.8, 0.01);
});

Deno.test("conversions: olijfolie 100 g → ml ≈ 108.6957", () => {
  assertAlmostEquals(convert(100, "g", "ml", olijfolie), 108.6957, 0.01);
});

Deno.test("conversions: spoons → ml (generiek)", () => {
  assertEquals(convert(1, "tl", "ml", generiek), 5);
  assertEquals(convert(1, "kop", "ml", generiek), 240);
  assertEquals(convert(2, "el", "ml", generiek), 30);
});

Deno.test("conversions: missing weight_per_piece_g throws MissingConversionError", () => {
  assertThrows(
    () => convert(2, "st", "kg", stZonderGewicht),
    MissingConversionError,
  );
});

Deno.test("conversions: unknown unit throws UnknownUnitError", () => {
  assertThrows(
    () => convert(1, "barrel", "g", generiek),
    UnknownUnitError,
  );
});

Deno.test("conversions: toBaseUnit normaliseert kg → g", () => {
  assertEquals(toBaseUnit(1.5, "kg", generiek), 1500);
});

Deno.test("conversions: fromBaseUnit g → kg", () => {
  assertEquals(fromBaseUnit(2500, "kg", generiek), 2.5);
});

Deno.test("conversions: case + trailing dot tolerance", () => {
  assertEquals(convert(1, "KG.", "g", generiek), 1000);
  assertEquals(convert(1, "Gram", "kg", generiek), 0.001);
});

Deno.test("conversions: chained ml → st via density + weight", () => {
  // hypothetisch: ingredient base=st, 100g/st, density 0.8
  const ing: Ingredient = { base_unit: "st", weight_per_piece_g: 100, density_g_per_ml: 0.8 };
  // 250 ml * 0.8 = 200 g → / 100g per st = 2 st
  assertEquals(convert(250, "ml", "st", ing), 2);
});
