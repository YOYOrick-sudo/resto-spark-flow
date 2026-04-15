import { useMemo } from "react";
import { useBijnaVerlopen, type BijnaVerlopenItem } from "./useBijnaVerlopen";
import { useVoorraadOverschot, type OverstockedItem } from "./useVoorraadOverschot";
import { useVoorraadNul } from "./useVoorraadNul";
import { useKeukenSettings } from "./useKeukenSettings";

export interface KeukenMelding {
  type: "bijna_verlopen" | "verlopen" | "voorraad_nul" | "voorraad_laag" | "overschot" | string;
  severity: "error" | "warning" | "info";
  titel: string;
  beschrijving: string;
  waarde?: number;
  actie_label?: string;
  actie_path?: string;
  items?: BijnaVerlopenItem[];
  overstockedItems?: OverstockedItem[];
}

function formatItemList(
  items: { label: string }[],
  max = 2
): string {
  const shown = items.slice(0, max).map((i) => i.label).join(" · ");
  const rest = items.length - max;
  return rest > 0 ? `${shown} · +${rest} meer` : shown;
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

    // Verlopen items
    const verlopen = bijnaVerlopen.filter((i) => i.dagen_resterend <= 0);
    if (verlopen.length > 0) {
      const totaleWaarde = verlopen.reduce((s, i) => s + i.geschatte_waarde, 0);
      meldingen.push({
        type: "verlopen",
        severity: "error",
        titel: `${verlopen.length} item${verlopen.length > 1 ? "s" : ""} verlopen`,
        beschrijving: formatItemList(
          verlopen.map((i) => ({ label: `${i.productnaam} — ${i.geschatte_hoeveelheid}` }))
        ),
        waarde: totaleWaarde,
        actie_label: "Personeelsmaaltijd bedenken",
        items: verlopen,
      });
    }

    // Bijna verlopen
    const bijna = bijnaVerlopen.filter((i) => i.dagen_resterend > 0);
    if (bijna.length > 0) {
      const totaleWaarde = bijna.reduce((s, i) => s + i.geschatte_waarde, 0);
      if (totaleWaarde >= minWaardeVerlopen) {
        meldingen.push({
          type: "bijna_verlopen",
          severity: "warning",
          titel: `${bijna.length} item${bijna.length > 1 ? "s" : ""} verloop${bijna.length > 1 ? "en" : "t"} binnenkort`,
          beschrijving: formatItemList(
            bijna.map((i) => ({
              label: `${i.productnaam} — ${i.geschatte_hoeveelheid}, ${i.dagen_resterend === 1 ? "morgen" : `over ${i.dagen_resterend} dagen`}`,
            }))
          ),
          waarde: totaleWaarde,
          actie_label: "Personeelsmaaltijd bedenken",
          items: bijna,
        });
      }
    }

    // Voorraad nul
    const nul = voorraadData?.nul ?? [];
    if (nul.length > 0) {
      meldingen.push({
        type: "voorraad_nul",
        severity: "error",
        titel: `${nul.length} ingrediënt${nul.length > 1 ? "en" : ""} op`,
        beschrijving: formatItemList(nul.map((i) => ({ label: i.naam }))),
        actie_label: "Bestelling aanmaken",
        actie_path: "/inkoop",
      });
    }

    // Voorraad laag
    const laag = voorraadData?.laag ?? [];
    if (laag.length > 0) {
      meldingen.push({
        type: "voorraad_laag",
        severity: "warning",
        titel: `${laag.length} ingrediënt${laag.length > 1 ? "en" : ""} onder minimum`,
        beschrijving: formatItemList(
          laag.map((i) => ({ label: `${i.naam} (${i.voorraad} ${i.eenheid})` }))
        ),
        actie_label: "Bestelling aanmaken",
        actie_path: "/inkoop",
      });
    }

    // Overstocked — versimpeld
    if (overstocked.length > 0) {
      meldingen.push({
        type: "overschot",
        severity: "info",
        titel: "Hoge voorraad",
        beschrijving: formatItemList(
          overstocked.map((i) => ({ label: `${i.naam} — ${i.hoeveelheid} ${i.eenheid}` }))
        ),
        actie_label: "Personeelsmaaltijd bedenken",
        overstockedItems: overstocked,
      });
    }

    // Sort: error > warning > info, then by value desc
    const sevOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
    meldingen.sort((a, b) => {
      const diff = (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2);
      return diff !== 0 ? diff : (b.waarde ?? 0) - (a.waarde ?? 0);
    });

    return meldingen;
  }, [bijnaVerlopen, overstocked, voorraadData, minWaardeVerlopen, minWaardeOverschot]);
}
