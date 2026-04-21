// Bidfood factuur parser
// Layout (geobserveerd): regels met artikelnummer (6-8 cijfers), product, hoeveelheid,
// eenheid, prijs per eenheid, totaal.

import type { ParsedRegel, ParserResult } from "./types.ts";

// Bidfood artikelnummers komen voor als puur cijfers (6-8) of dotted (14.55.46).
const ARTNR_RE = /\b(\d{2,3}\.\d{2,3}\.\d{2,3}|\d{6,8})\b/;
const AMOUNT_TAIL_RE = /([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})\s*$/;
const TWO_AMOUNTS_TAIL_RE =
  /([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})\s+([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})\s*$/;
const QTY_UNIT_RE = /\b(\d+(?:[.,]\d+)?)\s*(ds|do|st|stuk|stuks|kg|g|gr|l|lt|liter|ml|krt|krat|bk|bak|pak|pk|fles|fl|zak|col|coll)\b/i;

// Bidfood regel-staart kan bevatten:
//   - btw-letter "V" / "L" / "H" (verlaagd / laag / hoog)
//   - btw-percentage "9%" / "21%"
//   - grootboeknummer (3-5 cijfers, bv "4001")
// Eerst btw-suffix strippen vóór amount matching.
const TAIL_NOISE_RE = /(?:\s+\d{1,2}%(?:\s+[A-Z])?|\s+[A-Z]|\s+\d{3,5})\s*$/;

const BLACKLIST_RE =
  /\b(subtotaal|totaal incl|totaal excl|btw|emballage|statiegeld|korting|leveringskosten|transport|toeslag|fust|rolcontainer|tussenlegger|saldo|pagina|page|factuurnr|factuurdatum|klantnr|klant nr|debiteur|bestelnummer)\b/i;

const FACTUURNR_RE = /factuur(?:nummer|nr\.?)\s*[:\s]+\s*([A-Z0-9\-\/]{4,20})/i;
const DATE_RE =
  /(\d{1,2})[-\/\.\s](\d{1,2}|jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)[-\/\.\s](\d{2,4})/i;
const TOTAAL_RE =
  /totaal(?:\s+(?:te\s+betalen|incl\.?\s*btw|incl\.?))?\s*[:\s€]+\s*([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})/i;

function parseAmount(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[\s\u00a0]/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  if (cleaned.includes(",")) return parseFloat(cleaned.replace(",", "."));
  const dotMatch = cleaned.match(/^\d+\.(\d+)$/);
  if (dotMatch && dotMatch[1].length === 3) {
    return parseFloat(cleaned.replace(/\./g, ""));
  }
  return parseFloat(cleaned);
}

function parseDateNL(raw: string): string | null {
  const m = raw.match(DATE_RE);
  if (!m) return null;
  const months: Record<string, number> = {
    jan: 1, feb: 2, mrt: 3, apr: 4, mei: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dec: 12,
  };
  const day = parseInt(m[1], 10);
  let month: number;
  const monthRaw = m[2].toLowerCase();
  if (months[monthRaw]) month = months[monthRaw];
  else month = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  if (!day || !month || !year) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseBidfood(pages: string[]): ParserResult {
  const allText = pages.join("\n");

  const factuurnrMatch = allText.match(FACTUURNR_RE);
  const factuurnummer = factuurnrMatch ? factuurnrMatch[1].trim() : null;
  const factuurdatum = parseDateNL(allText);
  const totaalMatch = allText.match(TOTAAL_RE);
  const totaalbedrag = totaalMatch ? parseAmount(totaalMatch[1]) : null;

  const regels: ParsedRegel[] = [];
  const candidateRowsPerPage: number[] = [];
  let totalCandidates = 0;
  let totalValid = 0;

  for (const pageText of pages) {
    const lines = pageText.split(/\r?\n/);
    let pageCandidates = 0;

    for (const rawLine of lines) {
      const original = rawLine.trim();
      if (!original || original.length < 10) continue;
      if (BLACKLIST_RE.test(original)) continue;

      const artnrMatch = original.match(ARTNR_RE);
      if (!artnrMatch) continue;

      // Strip Bidfood-staart-noise (btw-letter, percentage, grootboeknummer)
      // herhaaldelijk: een regel kan meerdere suffixes hebben (bv "9% L 4001").
      let line = original;
      for (let i = 0; i < 3; i++) {
        const stripped = line.replace(TAIL_NOISE_RE, "").trimEnd();
        if (stripped === line) break;
        line = stripped;
      }

      const twoAmt = line.match(TWO_AMOUNTS_TAIL_RE);
      const oneAmt = !twoAmt ? line.match(AMOUNT_TAIL_RE) : null;
      if (!twoAmt && !oneAmt) continue;

      pageCandidates++;
      totalCandidates++;

      const artnr = artnrMatch[1];
      let prijsPerEenheid: number | null = null;
      let totaal: number | null = null;

      if (twoAmt) {
        prijsPerEenheid = parseAmount(twoAmt[1]);
        totaal = parseAmount(twoAmt[2]);
      } else if (oneAmt) {
        totaal = parseAmount(oneAmt[1]);
      }

      let hoeveelheid: number | null = null;
      let eenheid: string | null = null;
      const qtyMatch = line.match(QTY_UNIT_RE);
      if (qtyMatch) {
        hoeveelheid = parseFloat(qtyMatch[1].replace(",", "."));
        eenheid = qtyMatch[2].toLowerCase();
      }

      let productNaam = line
        .replace(artnrMatch[0], " ")
        .replace(TWO_AMOUNTS_TAIL_RE, "")
        .replace(AMOUNT_TAIL_RE, "");
      if (qtyMatch) productNaam = productNaam.replace(qtyMatch[0], " ");
      productNaam = productNaam.replace(/\s+/g, " ").trim();
      if (!productNaam) continue;

      const validRow =
        artnr.length >= 6 && totaal != null && productNaam.length > 2;
      if (validRow) totalValid++;

      regels.push({
        artikelnummer: artnr,
        product_naam: productNaam,
        hoeveelheid,
        eenheid,
        prijs_per_eenheid: prijsPerEenheid,
        totaal,
      });
    }

    candidateRowsPerPage.push(pageCandidates);
  }

  const confidence =
    totalCandidates === 0 ? 0 : Math.round((totalValid / totalCandidates) * 100) / 100;

  return {
    leverancier_naam_raw: "Bidfood",
    factuurnummer,
    factuurdatum,
    totaalbedrag,
    regels,
    confidence,
    candidate_rows_per_page: candidateRowsPerPage,
  };
}
