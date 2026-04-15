import { useMemo } from "react";
import { useBijnaVerlopen, type BijnaVerlopenItem } from "./useBijnaVerlopen";
import { useVoorraadOverschot, type OverstockedItem } from "./useVoorraadOverschot";
import { useVoorraadNul } from "./useVoorraadNul";
import { useKeukenSettings } from "./useKeukenSettings";

export interface KeukenMelding {
  type: "bijna_verlopen" | "verlopen" | "voorraad_nul" | "voorraad_laag" | "overschot";
  severity: "error" | "warning" | "info";
  titel: string;
  beschrijving: string;
  waarde?: number;
  actie_label?: string;
  actie_path?: string;
  items?: BijnaVerlopenItem[];
  overstockedItems?: OverstockedItem[];
}

export function useKeukenMeldingen() {
  const { data: settings } = useKeukenSettings();
  const minWaardeVerlopen = (settings as any)?.assistent_min_waarde_verlopen ?? 5;
  const minWaardeOverschot = (settings as any)?.assistent_min_waarde_overschot ?? 10;

  const { data: bijnaVerlopen = [] } = useBijnaVerlopen(2);
  const { data: overstocked = [] } = useVoorraadOverschot(minWaardeOverschot);
  const { data: voorraadData } = useVoorraadNul();

  return useMemo(() => {
    const meldingen: KeukenMelding[] = [];

    // Verlopen items (dagen_resterend <= 0) — always show
    const verlopen = bijnaVerlopen.filter((i) => i.dagen_resterend <= 0);
    if (verlopen.length > 0) {
      const totaleWaarde = verlopen.reduce((s, i) => s + i.geschatte_waarde, 0);
      meldingen.push({
        type: "verlopen",
        severity: "error",
        titel: `${verlopen.length} item${verlopen.length > 1 ? "s" : ""} verlopen`,
        beschrijving: verlopen.map((i) => `${i.productnaam} (${i.geschatte_hoeveelheid})`).join(", "),
        waarde: totaleWaarde,
        actie_label: "Personeelsmaaltijd bedenken",
        items: verlopen,
      });
    }

    // Bijna verlopen (dagen_resterend > 0) — only if value >= threshold
    const bijna = bijnaVerlopen.filter((i) => i.dagen_resterend > 0);
    if (bijna.length > 0) {
      const totaleWaarde = bijna.reduce((s, i) => s + i.geschatte_waarde, 0);
      if (totaleWaarde >= minWaardeVerlopen) {
        meldingen.push({
          type: "bijna_verlopen",
          severity: "warning",
          titel: `${bijna.length} item${bijna.length > 1 ? "s" : ""} verloop${bijna.length > 1 ? "en" : "t"} binnenkort`,
          beschrijving: bijna
            .map((i) => `${i.productnaam} (${i.geschatte_hoeveelheid}, ${i.dagen_resterend === 1 ? "morgen" : `over ${i.dagen_resterend} dagen`})`)
            .join(", "),
          waarde: totaleWaarde,
          actie_label: "Personeelsmaaltijd bedenken",
          items: bijna,
        });
      }
    }

    // Voorraad nul — always show
    const nul = voorraadData?.nul ?? [];
    if (nul.length > 0) {
      meldingen.push({
        type: "voorraad_nul",
        severity: "error",
        titel: `${nul.length} ingrediënt${nul.length > 1 ? "en" : ""} op`,
        beschrijving: nul.slice(0, 5).map((i) => i.naam).join(", ") + (nul.length > 5 ? ` +${nul.length - 5}` : ""),
        actie_label: "Bestelling aanmaken",
        actie_path: "/inkoop",
      });
    }

    // Voorraad laag — always show
    const laag = voorraadData?.laag ?? [];
    if (laag.length > 0) {
      meldingen.push({
        type: "voorraad_laag",
        severity: "warning",
        titel: `${laag.length} ingrediënt${laag.length > 1 ? "en" : ""} onder minimum`,
        beschrijving: laag.slice(0, 5).map((i) => `${i.naam} (${i.voorraad} ${i.eenheid})`).join(", "),
        actie_label: "Bestelling aanmaken",
        actie_path: "/inkoop",
      });
    }

    // Overstocked — only if value >= threshold
    if (overstocked.length > 0) {
      meldingen.push({
        type: "overschot",
        severity: "info",
        titel: `${overstocked.length} ingrediënt${overstocked.length > 1 ? "en" : ""} overstocked`,
        beschrijving: overstocked
          .slice(0, 3)
          .map((i) => `${i.naam} (${i.hoeveelheid} ${i.eenheid}, ${i.ratio}× weekverbruik)`)
          .join(", "),
        overstockedItems: overstocked,
      });
    }

    return meldingen;
  }, [bijnaVerlopen, overstocked, voorraadData, minWaardeVerlopen, minWaardeOverschot]);
}
