// Bidfood factuur parser
// Layout (geverifieerd op echte PDF):
//   artnr aantal eh inhoud merk omschrijving prijs eh bruto BTW-letter totaal-incl-btw grootboek(2-3 cijfers)
// Per-order blokken: "Ordnr.BFD:NNNNNN"
// Lastdragers (emballage): regels die starten met "L\d" (bv "L1.00.00") → skippen.

import type { ParsedRegel, ParserResult } from "./types.ts";

// Bidfood artikelnummers: dotted (14.55.46) of puur cijfers (6-8).
// Lastdragers L1.xx.xx worden apart geskipt vóór de match.
const ARTNR_RE = /\b(\d{2,3}\.\d{2,3}\.\d{2,3}|\d{6,8})\b/;
const AMOUNT_TAIL_RE = /([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})\s*$/;
const TWO_AMOUNTS_TAIL_RE =
  /([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})\s+([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2})\s*$/;
const QTY_UNIT_RE = /\b(\d+(?:[.,]\d+)?)\s*(ds|do|st|stuk|stuks|kg|g|gr|l|lt|liter|ml|krt|krat|kr|tr|bk|bak|pak|pk|fles|fl|zk|zak|cn|col|coll)\b/i;

// Tail-noise patronen — itereer tot stabiel (max 5x):
//   - trailing grootboek 2-3 cijfers (Bidfood: 72/79/88/90/97/98)
//   - losse BTW-letter L/H/V/N aan eind
const TAIL_GROOTBOEK_RE = /\s+\d{2,3}\s*$/;
const TAIL_BTW_LETTER_RE = /\s+[LHVN]\s*$/;

const BLACKLIST_RE =
  /\b(subtotaal|totaal incl|totaal excl|btw|emballage|statiegeld|korting|leveringskosten|transport|toeslag|fust|rolcontainer|tussenlegger|saldo|pagina|page|factuurnr|factuurdatum|klantnr|klant nr|debiteur|bestelnummer|lastdragers|levering dc|uw order|pakbon|ordnr|relatienummer|rayonnummer|bladnummer|skalnr|factuurbedrag|factuuradres|afleveradres)\b/i;

const ORDNR_RE = /Ordnr\.BFD:\s*(\d{4,8})/i;
const FACTUURNR_RE = /factuur(?:nummer|nr\.?)\s*[:\s]+\s*([A-Z0-9\-\/]{4,20})/i;
const DATE_RE =
  /(\d{1,2})[-\/\.\s](\d{1,2}|jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)[-\/\.\s](\d{2,4})/i;
// Strikter: alleen "totaal te betalen / totaal incl btw / factuurbedrag / te voldoen".
// Voorkomt match op kolom-header "Totaal".
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

function stripTailNoise(line: string): string {
  let cur = line;
  for (let i = 0; i < 5; i++) {
    const before = cur;
    cur = cur.replace(TAIL_GROOTBOEK_RE, "").trimEnd();
    cur = cur.replace(TAIL_BTW_LETTER_RE, "").trimEnd();
    if (cur === before) break;
  }
  return cur;
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
  let currentOrdernr: string | null = null;

  for (const pageText of pages) {
    const lines = pageText.split(/\r?\n/);
    let pageCandidates = 0;

    for (const rawLine of lines) {
      const original = rawLine.trim();
      if (!original || original.length < 10) continue;

      // Per-order tracking (vóór blacklist — ordnr-regels worden alsnog blacklisted)
      const ordnrMatch = original.match(ORDNR_RE);
      if (ordnrMatch) {
        currentOrdernr = ordnrMatch[1];
        continue;
      }

      // Skip lastdragers (emballage) — beginnen met L<digit>
      if (/^L\d/.test(original)) continue;

      if (BLACKLIST_RE.test(original)) continue;

      const artnrMatch = original.match(ARTNR_RE);
      if (!artnrMatch) continue;

      // Strip trailing grootboek + BTW-letter iteratief
      const line = stripTailNoise(original);

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
        ordernr: currentOrdernr,
      });
    }

    candidateRowsPerPage.push(pageCandidates);
  }

  // Dedup op artnr|ordernr|totaal — verschillende ordernrs = behouden
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
    leverancier_naam_raw: "Bidfood",
    factuurnummer,
    factuurdatum,
    totaalbedrag,
    regels: deduped,
    confidence,
    candidate_rows_per_page: candidateRowsPerPage,
  };
}
