export const PORTIE_DEFAULTS: Record<string, { hoeveelheid: number; eenheid: string }> = {
  "Vlees":                  { hoeveelheid: 0.15, eenheid: "kg" },
  "Vis":                    { hoeveelheid: 0.15, eenheid: "kg" },
  "Groenten":               { hoeveelheid: 0.15, eenheid: "kg" },
  "Zuivel":                 { hoeveelheid: 0.10, eenheid: "kg" },
  "Droog & Conserven":      { hoeveelheid: 0.10, eenheid: "kg" },
  "Kruiden & Specerijen":   { hoeveelheid: 0.01, eenheid: "kg" },
  "Olie & Vetten":          { hoeveelheid: 0.02, eenheid: "L"  },
};

export function getPortieVoorPersonen(
  categorie: string,
  aantalPersonen: number
): { hoeveelheid: number; eenheid: string } {
  const defaults = PORTIE_DEFAULTS[categorie] || { hoeveelheid: 0.10, eenheid: "kg" };
  return {
    hoeveelheid: Math.round(defaults.hoeveelheid * aantalPersonen * 100) / 100,
    eenheid: defaults.eenheid,
  };
}
