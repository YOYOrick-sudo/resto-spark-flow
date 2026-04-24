import { format } from "date-fns";
import { nl } from "date-fns/locale";

/**
 * TZ-safe parse van een YYYY-MM-DD string als lokale datum (geen UTC-shift).
 * Voorkomt dat "2026-03-09" wordt geïnterpreteerd als UTC midnight en
 * vervolgens in CET als "2026-03-08" wordt getoond.
 */
function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Inbox-format: "maandag 9 maart"
 * Edge-case: pakbon ouder dan 30 dagen → toon ook jaar
 * ("maandag 9 maart 2026") om verwarring bij oude openstaande pakbonnen
 * te voorkomen.
 */
export function formatLeveringDatumInbox(dateStr: string | null): string {
  if (!dateStr) return "Datum onbekend";
  const date = parseDateLocal(dateStr);
  const daysDiff = Math.abs(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  const formatStr = daysDiff > 30 ? "EEEE d MMMM yyyy" : "EEEE d MMMM";
  return format(date, formatStr, { locale: nl });
}

/**
 * Detail-format: altijd volledig "maandag 9 maart 2026".
 */
export function formatLeveringDatumDetail(dateStr: string | null): string {
  if (!dateStr) return "Datum onbekend";
  const date = parseDateLocal(dateStr);
  return format(date, "EEEE d MMMM yyyy", { locale: nl });
}
