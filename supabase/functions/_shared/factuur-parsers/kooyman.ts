// Kooyman factuur parser
// Layout (geverifieerd): Art.nr Aantal VP Ordernr Omschrijving Groep Prijs Totaal BTW Emb.
// - Ordernr is 6-cijferig (78XXXX) en staat na qty+eenheid.
// - PDF text-extract wraps soms unit-namen over 2 regels (bv "overdo" + "os").
// - PDF kan dezelfde regel dupliceren binnen 1 ordernr.

import type { ParsedRegel, ParserResult } from "./types.ts";

const ARTNR_RE = /\b(\d{5,7})\b/;
const AMOUNT_TAIL_RE = /([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})\s*$/;
const TWO_AMOUNTS_TAIL_RE =
  /([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})\s+([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})\s*$/;
const QTY_UNIT_RE = /\b(\d+(?:[.,]\d+)?)\s*(ds|do|doos|emmer|pc|can|st|stuk|stuks|kg|g|gr|l|lt|liter|ml|krt|krat|bk|bak|pak|pk|fles|fl|zak)\b/i;
// Ordernr: 6 cijfers (Kooyman gebruikt 78XXXX serie maar generaal 6 cijfers).
// Match alleen na een eenheid om verwarring met andere getallen te vermijden.
const ORDERNR_AFTER_UNIT_RE = /\b\d+(?:[.,]\d+)?\s+(?:doos|emmer|pc|can|zak|krat|bak|stuk|stuks|kg|fles|fl|ds|st|do|pak|pk)\s+(\d{6})\b/i;

const BLACKLIST_RE =
  /\b(subtotaal|totaal incl|totaal excl|btw|emballage|statiegeld|korting|leveringskosten|verzendkosten|transport|toeslag|fust|rolcontainer|tussenlegger|saldo|pagina|page|factuurnr|factuurdatum|klantnr|klant nr|debiteur|per order)\b/i;

const BTW_SUFFIX_RE = /\s+\d{1,2}%(?:\s+[A-Z])?\s*$/;

const FACTUURNR_RE = /factuur(?:nummer|nr\.?)\s*[:\s]+\s*([A-Z0-9\-\/]{4,20})/i;
const DATE_RE =
  /(\d{1,2})[-\/\.\s](\d{1,2}|jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)[-\/\.\s](\d{2,4})/i;
// Strikter: alleen "totaal te betalen / totaal incl btw / factuurbedrag / te voldoen"
// — voorkomt match op kolom-header "Totaal" in tabel-header.
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
 * Line-merge pre-pass: PDF wraps soms eenheid+omschrijving over 2 regels.
 * Heuristiek: regel met artnr maar zonder amount-tail (na btw-suffix-strip)
 * → merge met volgende regel als die geen artnr heeft.
 */
function mergeWrappedLines(lines: string[]): string[] {
  const merged: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const cur = lines[i].trim();
    if (!cur) { i++; continue; }

    const hasArtnr = ARTNR_RE.test(cur);
    if (hasArtnr) {
      const stripped = cur.replace(BTW_SUFFIX_RE, "").trimEnd();
      const hasAmount =
        TWO_AMOUNTS_TAIL_RE.test(stripped) || AMOUNT_TAIL_RE.test(stripped);
      if (!hasAmount && i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (next && !ARTNR_RE.test(next.split(/\s+/)[0] ?? "")) {
          merged.push(cur + " " + next);
          i += 2;
          continue;
        }
      }
    }
    merged.push(cur);
    i++;
  }
  return merged;
}

export function parseKooyman(pages: string[]): ParserResult {
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
    const rawLines = pageText.split(/\r?\n/);
    const lines = mergeWrappedLines(rawLines);
    let pageCandidates = 0;

    for (const rawLine of lines) {
      const original = rawLine.trim();
      if (!original || original.length < 10) continue;
      if (BLACKLIST_RE.test(original)) continue;

      const artnrMatch = original.match(ARTNR_RE);
      if (!artnrMatch) continue;

      const line = original.replace(BTW_SUFFIX_RE, "").trimEnd();

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

      // Ordernr extractie: 6 cijfers ná qty+eenheid
      let ordernr: string | null = null;
      const ordnrMatch = line.match(ORDERNR_AFTER_UNIT_RE);
      if (ordnrMatch) ordernr = ordnrMatch[1];

      let productNaam = line
        .replace(artnrMatch[0], " ")
        .replace(TWO_AMOUNTS_TAIL_RE, "")
        .replace(AMOUNT_TAIL_RE, "");
      if (qtyMatch) productNaam = productNaam.replace(qtyMatch[0], " ");
      if (ordernr) productNaam = productNaam.replace(new RegExp(`\\b${ordernr}\\b`), " ");
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
        ordernr,
      });
    }

    candidateRowsPerPage.push(pageCandidates);
  }

  // Dedup pass: artnr|ordernr|totaal — verschillende ordernrs = behouden
  const seen = new Set<string>();
  const deduped: ParsedRegel[] = [];
  for (const r of regels) {
    const key = `${r.artikelnummer ?? ''}|${r.ordernr ?? ''}|${r.totaal ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }

  const confidence =
    totalCandidates === 0 ? 0 : Math.round((totalValid / totalCandidates) * 100) / 100;

  return {
    leverancier_naam_raw: "Kooyman",
    factuurnummer,
    factuurdatum,
    totaalbedrag,
    regels: deduped,
    confidence,
    candidate_rows_per_page: candidateRowsPerPage,
  };
}
