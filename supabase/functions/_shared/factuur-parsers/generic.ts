// Generic fallback parser — werkt op breed regex-patroon:
// regel met artikelnummer (5-8 cijfers) + bedrag aan einde (XX,YY of XX.YY)
// + niet in blacklist.
//
// Drempel voor acceptatie: confidence ≥ 0.90 (conservatief, om vervuilde
// matches op rare layouts te voorkomen — zie sprint-toevoeging A).

import type { ParsedRegel, ParserResult } from "./types.ts";

const ARTNR_RE = /\b(\d{5,8})\b/;
const AMOUNT_TAIL_RE = /([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})\s*$/;
const TWO_AMOUNTS_TAIL_RE =
  /([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})\s+([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})\s*$/;
const QTY_UNIT_RE = /\b(\d+(?:[.,]\d+)?)\s*(ds|do|st|stuk|stuks|kg|g|gr|l|lt|liter|ml|krt|krat|bk|bak|pak|pk|fles|fl|zak)\b/i;

const BLACKLIST_RE =
  /\b(subtotaal|totaal incl|totaal excl|btw|emballage|statiegeld|korting|leveringskosten|verzendkosten|transport|toeslag|fust|saldo|pagina|page|factuurnr|factuurdatum|klantnr|debiteur)\b/i;

const FACTUURNR_RE = /factuur(?:nummer|nr\.?)\s*[:\s]+\s*([A-Z0-9\-\/]{4,20})/i;
const DATE_RE =
  /(\d{1,2})[-\/\.\s](\d{1,2}|jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)[-\/\.\s](\d{2,4})/i;
// Strikter: alleen "totaal te betalen / totaal incl btw / factuurbedrag / te voldoen"
// — voorkomt match op kolom-header "Totaal".
const TOTAAL_RE =
  /(?:totaal\s+(?:te\s+betalen|incl\.?\s*btw)|factuurbedrag|te\s+voldoen)\s*[:\s€]+\s*([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})/i;

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

/**
 * Probeer leverancier-naam te detecteren uit eerste pagina.
 * Eerste niet-lege regel die geen factuur-meta is, is meestal de leveranciersnaam.
 */
function detectLeverancierNaam(page1: string): string | null {
  const lines = page1.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 10)) {
    if (line.length < 3 || line.length > 60) continue;
    if (/factuur|invoice|datum|nummer|btw|kvk|iban/i.test(line)) continue;
    if (/^\d/.test(line)) continue;
    return line;
  }
  return null;
}

export function parseGeneric(pages: string[]): ParserResult {
  const allText = pages.join("\n");
  const leverancierNaam = pages[0] ? detectLeverancierNaam(pages[0]) : null;

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
      const line = rawLine.trim();
      if (!line || line.length < 10) continue;
      if (BLACKLIST_RE.test(line)) continue;

      const artnrMatch = line.match(ARTNR_RE);
      if (!artnrMatch) continue;

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
        artnr.length >= 5 && totaal != null && productNaam.length > 2;
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
    leverancier_naam_raw: leverancierNaam,
    factuurnummer,
    factuurdatum,
    totaalbedrag,
    regels,
    confidence,
    candidate_rows_per_page: candidateRowsPerPage,
  };
}
