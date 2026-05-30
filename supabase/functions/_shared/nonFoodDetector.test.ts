// supabase/functions/_shared/nonFoodDetector.test.ts
// V1 + V3 tests — test-first vóór de parse-pakbon fix.
// Run: deno test supabase/functions/_shared/nonFoodDetector.test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isNonFoodLine } from "./nonFoodDetector.ts";

// ---------------------------------------------------------------------------
// V1 — non-food MOET geskipt worden (keyword-signaal)
// ---------------------------------------------------------------------------

const NON_FOOD_CASES = [
  "DEKSEL BEKER KRAFT",
  "Lunchbox 1000ml",
  "Vacuumzakken 30x40",
  "Vacuum zak 20x30",
  "Schoonmaakazijn 5L",
  "Rio Schoonmaakazijn",
  "Fust groen",
  "Rolcontainer vers",
  "Emballage paddestoelen tray",
  "Statiegeld 0,15",
  "Servetten 33x33 wit",
  "Rietjes papier 200st",
  "Allesreiniger 5L",
  "Afwasmiddel pro 5L",
  "Bakje 500ml transparant",
  "Folie 45cm × 300m",
];

for (const naam of NON_FOOD_CASES) {
  Deno.test(`V1 non-food: "${naam}" → skip`, () => {
    const result = isNonFoodLine(naam);
    assertEquals(
      result.isNonFood,
      true,
      `Verwacht non-food, kreeg food. detectedBy=${result.detectedBy}`,
    );
  });
}

// ---------------------------------------------------------------------------
// V3 — food-regressie. Deze MOGEN NOOIT geskipt worden.
// ---------------------------------------------------------------------------

const FOOD_CASES = [
  "Olijfolie extra vierge 5L",
  "Olijfolie Abril Pom 5L",
  "Aubergine",
  "Rucola gewassen 250 gr",
  "Spitskool kg",
  "Tauge kg",
  "Gember kg",
  "Peer conference",
  "Venkel",
  "Bleekselderij",
  "Sinaasappel net 5kg",
  "Dille bos",
  "Munt (mint)",
  "Bosuien (lang)",
  "Winterpeen kist 20 kg",
  "Komkommer doos 36st",
  "Tomaten trostros",
  "Bloemkool per stuk",
  // Substring-traps: deze hadden met loose regex MIS kunnen gaan
  "Bordeaux rood AOC", // 'bord' in 'bordeaux' — hard-good keyword is bewust niet aanwezig
  "Glaszuivere honing 500g", // 'glas' niet in keyword-set
  "Trayfast koffiepads", // 'tray' is wel non-food keyword → maar word-boundary; "Trayfast" matcht niet
];

for (const naam of FOOD_CASES) {
  Deno.test(`V3 food: "${naam}" → géén skip`, () => {
    const result = isNonFoodLine(naam);
    assertEquals(
      result.isNonFood,
      false,
      `Food werd ten onrechte als non-food geclassificeerd. detectedBy=${result.detectedBy}`,
    );
  });
}

// ---------------------------------------------------------------------------
// AI-signaal — los van keyword
// ---------------------------------------------------------------------------

Deno.test("AI-signaal: is_non_food=true op food-naam → toch skip", () => {
  const result = isNonFoodLine("Geheimzinnig product X", true);
  assertEquals(result.isNonFood, true);
  assertEquals(result.detectedBy, ["ai_extractie"]);
});

Deno.test("AI + keyword: beide signalen geregistreerd", () => {
  const result = isNonFoodLine("Lunchbox 1000ml", true);
  assertEquals(result.isNonFood, true);
  assertEquals(result.detectedBy.length, 2);
});

Deno.test("Lege / null naam zonder AI → geen skip", () => {
  assertEquals(isNonFoodLine(null).isNonFood, false);
  assertEquals(isNonFoodLine("").isNonFood, false);
  assertEquals(isNonFoodLine(undefined).isNonFood, false);
});
