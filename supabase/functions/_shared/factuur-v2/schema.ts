// supabase/functions/_shared/factuur-v2/schema.ts
// Sprint Factuur-AI V2 — JSON Schema voor Gemini responseSchema (structured output).
//
// AI mag GEEN andere waardes voor verpakking_eenheid (L|kg|stuk) of
// btw_percentage (0|9|21) teruggeven. Dwingt consistentie af op model-niveau.
//
// strict:true op gateway-niveau zorgt dat het schema hard wordt afgedwongen.

export const FACTUUR_V2_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: [
    "extractie_status",
    "leverancier_naam",
    "regels",
    "totaal_incl_btw",
  ],
  properties: {
    extractie_status: {
      type: "string",
      enum: ["success", "partial", "failed"],
    },
    leverancier_naam: { type: "string" },
    leverancier_btw_nummer: {
      type: ["string", "null"],
      description:
        "BTW-nummer formaat NL\\d{9}B\\d{2} (bv NL123456789B01). Null als niet gevonden.",
    },
    leverancier_kvk: {
      type: ["string", "null"],
      description: "KvK nummer 8 cijfers. Null als niet gevonden.",
    },
    factuur_nummer: { type: ["string", "null"] },
    factuur_datum: {
      type: ["string", "null"],
      description: "ISO 8601 YYYY-MM-DD. NL-factuur DD-MM-YYYY converteren.",
    },
    subtotaal_excl_btw: {
      type: ["number", "null"],
      description: "Subtotaal exclusief BTW. Decimalen met punt.",
    },
    btw_regels: {
      type: "array",
      description: "Aparte regel per BTW-tarief.",
      items: {
        type: "object",
        required: ["percentage", "basis_bedrag", "btw_bedrag"],
        properties: {
          percentage: {
            type: "number",
            enum: [0, 9, 21],
            description: "NL BTW-tarieven. Andere waardes = error.",
          },
          basis_bedrag: { type: "number" },
          btw_bedrag: { type: "number" },
        },
      },
    },
    totaal_incl_btw: { type: "number" },
    regels: {
      type: "array",
      items: {
        type: "object",
        required: ["product_naam", "verpakking_eenheid"],
        properties: {
          artikelnummer: {
            type: ["string", "null"],
            description:
              "Leveranciers artikelnummer. KRITIEK voor cache-match. Null bij twijfel.",
          },
          product_naam: {
            type: "string",
            description:
              "Schone productnaam zonder prijzen, kolom-codes of trailing suffixes (KR, L, DS, ZK, TR, BK).",
          },
          product_omschrijving_kort: {
            type: ["string", "null"],
            description:
              "Korte naam voor matching tegen ingredienten. Bv 'olijfolie'. Geen merk/verpakking.",
          },
          hoeveelheid_besteld: {
            type: ["number", "null"],
            description: "Aantal besteld (bv 2 dozen olijfolie).",
          },
          verpakking_hoeveelheid: {
            type: ["number", "null"],
            description:
              "Hoeveelheid per besteld item in basiseenheid. 5L fles → 5. 24×33cl bier → 24. 500gr boter → 0.5.",
          },
          verpakking_eenheid: {
            type: "string",
            enum: ["L", "kg", "stuk"],
            description:
              "Basiseenheid waarin chef rekent. Drank ALTIJD stuk. Olie/sap/melk = L. Vlees/vis/groente = kg.",
          },
          prijs_per_besteld_item: {
            type: ["number", "null"],
            description: "Prijs per besteld item zoals op factuur.",
          },
          prijs_per_basiseenheid: {
            type: ["number", "null"],
            description:
              "Prijs per L/kg/stuk = prijs_per_besteld_item / verpakking_hoeveelheid.",
          },
          prijs_totaal: {
            type: ["number", "null"],
            description:
              "Regeltotaal = hoeveelheid_besteld × prijs_per_besteld_item.",
          },
          btw_percentage: {
            type: ["number", "null"],
            enum: [0, 9, 21, null],
          },
          is_emballage: {
            type: "boolean",
            description: "True bij statiegeld/emballage-regel.",
          },
          is_credit: {
            type: "boolean",
            description: "True bij negatief bedrag of retour/credit.",
          },
          confidence: {
            type: "string",
            enum: ["hoog", "medium", "laag"],
          },
        },
      },
    },
    extractie_waarschuwingen: {
      type: "array",
      description: "Velden of regels waar AI onzeker over was.",
      items: { type: "string" },
    },
  },
};
