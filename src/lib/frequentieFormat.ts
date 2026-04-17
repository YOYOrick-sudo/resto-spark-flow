/**
 * Helpers voor frequentie-weergave + run-tijdordening.
 * Gedeeld tussen TemplatesTab (badge in 72px-kolom),
 * DagelijksTab (tijdlijn-sortering) en TakenRun (per-item indicator).
 */
import type { Frequentie } from "@/hooks/useChecklistTemplates";

const WEEKDAG_KORT: Record<number, string> = {
  1: "Ma", 2: "Di", 3: "Wo", 4: "Do", 5: "Vr", 6: "Za", 7: "Zo",
};

/**
 * Compacte representatie van een frequentie + config.
 * Voorbeelden: "Dag", "Di", "2wk Do", "15e", "Kwart", "½jr", "Jr", "7d".
 * Geeft `null` als de frequentie ontbreekt (= "erft van template").
 */
export function formatFrequentieKort(
  freq: Frequentie | undefined | null,
  config: Record<string, any> | undefined | null
): string | null {
  if (!freq) return null;
  const c = config ?? {};

  switch (freq) {
    case "dagelijks":
      return "Dag";
    case "wekelijks": {
      const dagen: number[] = Array.isArray(c.weekdagen) ? c.weekdagen : [];
      const interval = Number(c.interval_weken) || 1;
      const sorted = [...dagen].sort((a, b) => a - b);
      const dagLabel = sorted.length === 0
        ? "—"
        : sorted.length === 1
          ? WEEKDAG_KORT[sorted[0]] ?? "?"
          : sorted.map((d) => WEEKDAG_KORT[d] ?? "?").join("·");
      return interval > 1 ? `${interval}wk ${dagLabel}` : dagLabel;
    }
    case "maandelijks": {
      const dag = Number(c.dag_van_maand) || 1;
      return `${dag}e`;
    }
    case "kwartaal":
      return "Kwart";
    case "halfjaar":
      return "½jr";
    case "jaarlijks":
      return "Jr";
    case "custom": {
      const interval = Number(c.interval_dagen) || 1;
      return `${interval}d`;
    }
    default:
      return null;
  }
}

/**
 * Iets uitgebreidere frequentie-tekst voor een run-card op de tijdlijn.
 * Wordt alleen getoond als modus='gebundeld' én niet-dagelijks.
 * Voorbeelden: "elke ma", "2wk do", "15e maand", "elk kwart".
 */
export function formatFrequentieLang(
  freq: Frequentie | undefined | null,
  config: Record<string, any> | undefined | null
): string | null {
  if (!freq) return null;
  const c = config ?? {};
  switch (freq) {
    case "dagelijks":
      return null; // niet tonen
    case "wekelijks": {
      const dagen: number[] = Array.isArray(c.weekdagen) ? c.weekdagen : [];
      const interval = Number(c.interval_weken) || 1;
      const sorted = [...dagen].sort((a, b) => a - b);
      const dagLabel = sorted.length === 0
        ? "—"
        : sorted.map((d) => (WEEKDAG_KORT[d] ?? "?").toLowerCase()).join("·");
      return interval > 1 ? `${interval}wk ${dagLabel}` : `elke ${dagLabel}`;
    }
    case "maandelijks":
      return `${Number(c.dag_van_maand) || 1}e v/d maand`;
    case "kwartaal":
      return "elk kwart";
    case "halfjaar":
      return "halfjaar";
    case "jaarlijks":
      return "jaarlijks";
    case "custom":
      return `elke ${Number(c.interval_dagen) || 1}d`;
    default:
      return null;
  }
}

/**
 * Effectieve start-tijd van een run (HH:MM):
 * 1. template.default_time
 * 2. settings.standaard_tijden_per_type[template.type]
 * 3. fallback "12:00"
 */
export function getEffectieveTijd(
  defaultTime: string | null | undefined,
  type: string | undefined,
  standaardTijden: Record<string, string> | undefined
): string {
  if (defaultTime) return defaultTime.slice(0, 5);
  if (type && standaardTijden?.[type]) return standaardTijden[type].slice(0, 5);
  return "12:00";
}

export type Dagdeel = "ochtend" | "middag" | "avond";

/**
 * Bepaal dagdeel op basis van HH:MM string.
 * Ochtend: <12:00 — Middag: 12:00–16:59 — Avond: ≥17:00.
 */
export function getDagdeel(time: string): Dagdeel {
  const h = parseInt(time.slice(0, 2), 10) || 0;
  if (h < 12) return "ochtend";
  if (h < 17) return "middag";
  return "avond";
}

export const DAGDEEL_LABEL: Record<Dagdeel, string> = {
  ochtend: "Ochtend",
  middag: "Middag",
  avond: "Avond",
};

export const DAGDEEL_TIJD: Record<Dagdeel, string> = {
  ochtend: "07:00 – 12:00",
  middag: "12:00 – 17:00",
  avond: "17:00 – sluit",
};

/**
 * Format YYYY-MM-DD → "vrijdag 17 april".
 */
export function formatDatumNL(datum: string): string {
  const d = new Date(`${datum}T00:00:00`);
  return d.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Format YYYY-MM-DD → "do 16 apr" (kort, voor overdue-marker).
 */
export function formatDatumKort(datum: string): string {
  const d = new Date(`${datum}T00:00:00`);
  return d.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
