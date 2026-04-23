// supabase/functions/_shared/factuur-v2/schema.ts
// Sprint Factuur-AI V2 — JSON Schema voor Gemini responseSchema (structured output).
//
// AI mag GEEN andere waardes voor verpakking_eenheid (L|kg|stuk) teruggeven.
// btw_percentage moet 0/9/21 zijn (door validator afgedwongen, niet via enum
// omdat numerieke enums door Gemini structured-output worden afgewezen).
//
// strict:true op gateway-niveau zorgt dat het schema hard wordt afgedwongen.
//
// LET OP: descriptions zijn bewust kort om response-tokens te minimaliseren.

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
      description: "Formaat NL\\d{9}B\\d{2}. Null indien onbekend.",
    },
    leverancier_kvk: {
      type: ["string", "null"],
      description: "KvK 8 cijfers. Null indien onbekend.",
    },
    factuur_nummer: { type: ["string", "null"] },
    factuur_datum: {
      type: ["string", "null"],
      description: "ISO 8601 YYYY-MM-DD (DD-MM-YYYY converteren).",
    },
    subtotaal_excl_btw: {
      type: ["number", "null"],
      description: "Netto subtotaal. Moet kloppen met som regel-totalen.",
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
            description:
              "NL BTW-tarief. ALLEEN 0, 9, of 21 toegestaan. Andere waarden zijn FOUT.",
          },
          basis_bedrag: { type: "number" },
          btw_bedrag: { type: "number" },
        },
      },
    },
    totaal_incl_btw: {
      type: "number",
      description: "Bruto eindbedrag = subtotaal + BTW.",
    },
    regels: {
      type: "array",
      items: {
        type: "object",
        required: ["product_naam", "verpakking_eenheid"],
        properties: {
          artikelnummer: {
            type: ["string", "null"],
            description: "Leveranciers artikelnummer. Null bij twijfel.",
          },
          product_naam: {
            type: "string",
            description:
              "Schone naam zonder prijzen of suffixes (KR, L, DS, ZK, TR, BK).",
          },
          product_omschrijving_kort: {
            type: ["string", "null"],
            description: "Korte naam voor matching. Geen merk/verpakking.",
          },
          hoeveelheid_besteld: {
            type: ["number", "null"],
            description: "Aantal besteld (excl. verpakking).",
          },
          verpakking_hoeveelheid: {
            type: ["number", "null"],
            description:
              "Hoeveelheid per item in basiseenheid. 5L fles=5. 24×33cl=24. 500gr=0.5.",
          },
          verpakking_eenheid: {
            type: "string",
            enum: ["L", "kg", "stuk"],
            description:
              "Basiseenheid. Drank ALTIJD stuk. Olie/sap/melk=L. Vlees/vis/groente=kg.",
          },
          prijs_per_besteld_item: {
            type: ["number", "null"],
            description: "Prijs per besteld item.",
          },
          prijs_per_basiseenheid: {
            type: ["number", "null"],
            description: "= prijs_per_besteld_item / verpakking_hoeveelheid.",
          },
          prijs_totaal: {
            type: ["number", "null"],
            description: "= hoeveelheid_besteld × prijs_per_besteld_item.",
          },
          btw_percentage: {
            type: ["number", "null"],
            description:
              "NL BTW per regel. ALLEEN 0, 9, of 21, of null (bv emballage). Andere waarden zijn FOUT.",
          },
          is_emballage: {
            type: "boolean",
            description: "True bij statiegeld/emballage.",
          },
          is_credit: {
            type: "boolean",
            description: "True bij negatief bedrag/retour.",
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
      description: "Onzekere velden/regels.",
      items: { type: "string" },
    },
  },
};
