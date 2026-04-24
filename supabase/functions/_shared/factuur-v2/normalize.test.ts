// supabase/functions/_shared/factuur-v2/normalize.test.ts
// Sprint Pakbon V1 — Stop-gate test voor stripPackagingSuffix.
//
// Verifieert dat:
//   1. Alle 16 Boer & Chef pakbon-regels correct gestript worden
//      (waar van toepassing) tot de DB-naam.
//   2. Edge cases — m.n. "Koriander bos" en "Peterselie krul bos" —
//      NIET gestript worden (anders breekt huidige Tier-2/3 match).
//   3. Producten zonder verpakkingssuffix ongewijzigd blijven.
//
// Run: deno test supabase/functions/_shared/factuur-v2/normalize.test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  normalizeMatchKey,
  normalizeMatchKeyStripped,
  stripPackagingSuffix,
} from "./normalize.ts";

// ---------------------------------------------------------------------------
// FIXTURE — 16 Boer & Chef pakbonregels (receipt 693aa82c…).
// Eerste kolom: AI raw (product_naam_herkend).
// Tweede:        verwachte stripped vorm (zoals het in DB staat).
// ---------------------------------------------------------------------------
const BOER_CHEF_FIXTURES: Array<{
  raw: string;
  expectedStripped: string;
  note?: string;
}> = [
  { raw: "Aubergine ds 5 kg", expectedStripped: "Aubergine" },
  { raw: "Aardappel agria kist 20kg", expectedStripped: "Aardappel agria" },
  { raw: "Bieten rood gekookt pak 500 gr", expectedStripped: "Bieten rood gekookt" },
  { raw: "Bloemkool kist 6 stuks", expectedStripped: "Bloemkool" },
  { raw: "Bosuien (kort) doos 14 stuks", expectedStripped: "Bosuien (kort)" },
  { raw: "Komkommer ds 12 stuks", expectedStripped: "Komkommer" },
  { raw: "Kool chinese per stuk", expectedStripped: "Kool chinese" },
  { raw: "Limoen (limes) ds 4,5 kg", expectedStripped: "Limoen (limes)" },
  { raw: "Oesterzwam kist 1,5 kg", expectedStripped: "Oesterzwam" },
  { raw: "Paksoi per stuk", expectedStripped: "Paksoi" },
  { raw: "Paprika rood ds 5 kg", expectedStripped: "Paprika rood" },
  { raw: "Shii-take kist 1,5 kg", expectedStripped: "Shii-take" },
  { raw: "Spinazie gewassen zak 450 gr", expectedStripped: "Spinazie gewassen" },
  // Emballage & speciale gevallen — zouden geen verpakkingssuffix moeten
  // hebben. Strip mag deze ongewijzigd laten (we vangen ze elders).
  { raw: "Emballage groot/klap", expectedStripped: "Emballage groot/klap" },
  { raw: "Emballage paddestoelen tray", expectedStripped: "Emballage paddestoelen tray" },
  // KRITIEK: Koriander bos is een ECHTE ingredient-naam. NIET strippen.
  { raw: "Koriander bos", expectedStripped: "Koriander bos", note: "bos is deel van naam" },
];

Deno.test("stripPackagingSuffix — Boer & Chef pakbon fixture (16 regels)", () => {
  for (const { raw, expectedStripped, note } of BOER_CHEF_FIXTURES) {
    const actual = stripPackagingSuffix(raw);
    assertEquals(
      actual,
      expectedStripped,
      `"${raw}" → "${actual}" (verwacht "${expectedStripped}")${
        note ? ` — ${note}` : ""
      }`,
    );
  }
});

// ---------------------------------------------------------------------------
// EDGE CASES — bescherm tegen valse strips
// ---------------------------------------------------------------------------

Deno.test("stripPackagingSuffix — geen suffix → unchanged", () => {
  // Producten waar suffix-regex NIETS mag doen.
  const cases = [
    "Aubergine",
    "Komkommer",
    "Paprika rood",
    "Sla rood (radicchio)",
    "Tomaat cherry pruim (snoep)",
    "Knoflook gepeld",
    "Aardappel friet", // 'friet' is geen verpakking
    "Spinazie",
    "Koriander", // standalone — geen suffix
  ];
  for (const c of cases) {
    assertEquals(stripPackagingSuffix(c), c, `"${c}" mag niet veranderen`);
  }
});

Deno.test("stripPackagingSuffix — KRITIEK: 'bos'/'bundel' als laatste woord blijft", () => {
  // Beschermd: deze zijn allemaal echte ingredient-namen waar bos/bundel
  // GEEN verpakking is. Mogen NIET gestript worden.
  const beschermd = [
    "Koriander bos",
    "Peterselie krul bos",
    "Munt (mint) bos",
    "Rozemarijn bos",
    "Basilicum bos",
    "Asperges bundel", // hypothetisch maar volgt zelfde patroon
  ];
  for (const c of beschermd) {
    assertEquals(
      stripPackagingSuffix(c),
      c,
      `"${c}" — 'bos/bundel' mag niet weg zonder volgend cijfer`,
    );
  }
});

Deno.test("stripPackagingSuffix — 'bos'/'bundel' MET getal wél strippen", () => {
  // Hier is bos/bundel wel verpakking.
  assertEquals(stripPackagingSuffix("Asperges bos 500 gr"), "Asperges");
  assertEquals(stripPackagingSuffix("Bosui bundel 100 gr"), "Bosui");
});

Deno.test("stripPackagingSuffix — case- en whitespace-tolerant", () => {
  assertEquals(stripPackagingSuffix("Aubergine DS 5 KG"), "Aubergine");
  assertEquals(stripPackagingSuffix("Aubergine   ds   5   kg"), "Aubergine");
  assertEquals(stripPackagingSuffix("  Aubergine ds 5 kg  "), "Aubergine");
});

Deno.test("stripPackagingSuffix — null/empty safe", () => {
  assertEquals(stripPackagingSuffix(""), "");
  assertEquals(stripPackagingSuffix(null), "");
  assertEquals(stripPackagingSuffix(undefined), "");
});

Deno.test("normalizeMatchKeyStripped — combineert strip + lowercase + collapse", () => {
  assertEquals(normalizeMatchKeyStripped("Aubergine ds 5 kg"), "aubergine");
  assertEquals(normalizeMatchKeyStripped("Koriander bos"), "koriander bos");
  assertEquals(normalizeMatchKeyStripped("Bosuien (kort) doos 14 stuks"), "bosuien (kort)");
  assertEquals(normalizeMatchKeyStripped(""), "");
});

Deno.test("normalizeMatchKey — onveranderd door deze sprint (regressie-check)", () => {
  // Bestaand gedrag mag niet kapot.
  assertEquals(normalizeMatchKey("Sla rood (radicchio)"), "sla rood (radicchio)");
  assertEquals(normalizeMatchKey("  Aubergine  "), "aubergine");
  assertEquals(normalizeMatchKey("Koriander bos"), "koriander bos");
});
