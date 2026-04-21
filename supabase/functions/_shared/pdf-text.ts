// supabase/functions/_shared/pdf-text.ts
// PDF text-extractie via unpdf (pure-JS, Deno-compatible).
// Sprint: Slimme factuur-AI Stap 1
//
// Gebruik:
//   const result = await extractTextPerPage(uint8Array);
//   if (result.pages == null) → scan-PDF, val terug op multimodal
//   else → result.pages = string[] per pagina

import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";

export interface TextExtractStats {
  total_pages: number;
  total_chars: number;
  chars_per_page: number[];
  pages_with_content: number;
  avg_chars_per_content_page: number;
  scan_detected: boolean;
}

export interface TextExtractResult {
  pages: string[] | null;
  stats: TextExtractStats;
}

const SCAN_THRESHOLD_CHARS_PER_PAGE = 50;

/**
 * Extract text per pagina uit PDF bytes via unpdf.
 *
 * Scan-detectie verfijnd:
 *   - pages_with_content = pagina's met >0 chars (negeer lege footer-pagina's)
 *   - avg = total_chars / pages_with_content
 *   - avg < 50 chars/pagina → scan-PDF → return pages: null
 *
 * Stats worden ALTIJD ingevuld voor SQL-debug doeleinden.
 */
export async function extractTextPerPage(
  bytes: Uint8Array
): Promise<TextExtractResult> {
  const emptyStats: TextExtractStats = {
    total_pages: 0,
    total_chars: 0,
    chars_per_page: [],
    pages_with_content: 0,
    avg_chars_per_content_page: 0,
    scan_detected: false,
  };

  let pages: string[];
  try {
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: false });
    // unpdf returnt { totalPages, text } waar text een string of string[] is
    if (Array.isArray(result.text)) {
      pages = result.text.map((p) => (p ?? "").trim());
    } else if (typeof result.text === "string") {
      pages = [result.text.trim()];
    } else {
      pages = [];
    }
  } catch (e: any) {
    console.warn("[pdf-text] extractText failed:", e?.message ?? String(e));
    return {
      pages: null,
      stats: { ...emptyStats, scan_detected: false },
    };
  }

  const charsPerPage = pages.map((p) => p.length);
  const totalChars = charsPerPage.reduce((a, b) => a + b, 0);
  const pagesWithContent = pages.filter((p) => p.length > 0).length;
  const avgCharsPerContentPage =
    pagesWithContent > 0 ? Math.round(totalChars / pagesWithContent) : 0;

  // Scan-detectie: gemiddeld <50 chars per content-pagina, OF helemaal geen content
  const scanDetected =
    pagesWithContent === 0 ||
    avgCharsPerContentPage < SCAN_THRESHOLD_CHARS_PER_PAGE;

  const stats: TextExtractStats = {
    total_pages: pages.length,
    total_chars: totalChars,
    chars_per_page: charsPerPage,
    pages_with_content: pagesWithContent,
    avg_chars_per_content_page: avgCharsPerContentPage,
    scan_detected: scanDetected,
  };

  if (scanDetected) {
    return { pages: null, stats };
  }

  return { pages, stats };
}
