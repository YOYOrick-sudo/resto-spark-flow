export interface PortieGrootteResult {
  hoeveelheid: number;
  eenheid: string;
  display: string; // e.g. "225g" or "0.19 kg" or "225 ml"
}

/**
 * Berekent de grootte van 1 portie op basis van methode output en aantal porties.
 * Converteert naar de meest leesbare eenheid (g ipv kg als < 1kg, ml ipv L als < 1L).
 */
export function berekenPortieGrootte(
  methodeOutput: number | null | undefined,
  methodeEenheid: string | null | undefined,
  aantalPorties: number | null | undefined
): PortieGrootteResult | null {
  if (!methodeOutput || !aantalPorties || aantalPorties <= 0 || !methodeEenheid) {
    return null;
  }

  let hoeveelheid = methodeOutput / aantalPorties;
  let eenheid = methodeEenheid;

  // Converteer naar leesbare eenheid
  if (eenheid === "kg" && hoeveelheid < 1) {
    hoeveelheid = Math.round(hoeveelheid * 1000);
    eenheid = "g";
  } else if (eenheid === "L" && hoeveelheid < 1) {
    hoeveelheid = Math.round(hoeveelheid * 1000);
    eenheid = "ml";
  } else {
    hoeveelheid = Math.round(hoeveelheid * 100) / 100; // 2 decimalen
  }

  return {
    hoeveelheid,
    eenheid,
    display: `${hoeveelheid}${eenheid}`,
  };
}

/**
 * Selecteert de primaire methode (type "Bereiden" eerst, anders eerste methode).
 */
export function getPrimaireMethode<
  T extends { type: string; output_hoeveelheid?: number | null; output_eenheid?: string | null }
>(methodes: T[] | undefined | null): T | null {
  if (!methodes || methodes.length === 0) return null;
  return methodes.find((m) => m.type === "Bereiden") || methodes[0];
}

/**
 * Converteert een hoeveelheid van een eenheid naar de methode-output eenheid.
 * Bijv. 300g naar kg als methode output in kg staat → 0.3
 */
export function converteerNaarMethodeEenheid(
  hoeveelheid: number,
  vanEenheid: string,
  naarEenheid: string
): number {
  if (vanEenheid === naarEenheid) return hoeveelheid;

  // g → kg
  if (vanEenheid === "g" && naarEenheid === "kg") return hoeveelheid / 1000;
  // kg → g
  if (vanEenheid === "kg" && naarEenheid === "g") return hoeveelheid * 1000;
  // ml → L
  if (vanEenheid === "ml" && naarEenheid === "L") return hoeveelheid / 1000;
  // L → ml
  if (vanEenheid === "L" && naarEenheid === "ml") return hoeveelheid * 1000;

  // Geen bekende conversie — return as-is
  return hoeveelheid;
}
