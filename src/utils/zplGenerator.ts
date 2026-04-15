import type { LabelVeld } from "@/hooks/useLabelTemplates";

export interface LabelData {
  productnaam: string;
  batch_nummer?: string;
  productie_datum: string;
  houdbaar_tot: string;
  medewerker?: string;
  allergenen?: string[];
  gewicht?: string;
  invries_datum?: string;
}

export interface PrintConfig {
  label_breedte_mm: number;
  label_hoogte_mm: number;
  darkness: number;
  speed: number;
}

function getVeldWaarde(data: LabelData, veld: string): string | null {
  switch (veld) {
    case "productnaam": return data.productnaam || null;
    case "batch_nummer": return data.batch_nummer || null;
    case "productie_datum": return data.productie_datum || null;
    case "houdbaar_tot": return data.houdbaar_tot || null;
    case "invries_datum": return data.invries_datum || null;
    case "medewerker": return data.medewerker || null;
    case "allergenen": return data.allergenen?.length ? data.allergenen.join(", ") : null;
    case "gewicht": return data.gewicht || null;
    default: return null;
  }
}

export function generateZPL(
  data: LabelData,
  config: PrintConfig,
  velden: LabelVeld[]
): string {
  const dotsPerMm = 8; // 203 dpi
  const width = config.label_breedte_mm * dotsPerMm;
  const height = config.label_hoogte_mm * dotsPerMm;

  let zpl = `^XA`;
  zpl += `^PW${width}`;
  zpl += `^LL${height}`;
  zpl += `^MD${config.darkness}`;
  zpl += `^PR${config.speed}`;

  let yPos = 16;
  const lineHeight = 40;
  const xMargin = 16;

  const actieveVelden = velden
    .filter((v) => v.actief)
    .sort((a, b) => a.volgorde - b.volgorde);

  for (const veld of actieveVelden) {
    const waarde = getVeldWaarde(data, veld.veld);
    if (!waarde) continue;

    if (veld.veld === "productnaam") {
      zpl += `^FO${xMargin},${yPos}^A0N,28,28^FD${sanitizeZpl(waarde)}^FS`;
      yPos += lineHeight + 4;
    } else if (veld.veld === "allergenen") {
      zpl += `^FO${xMargin},${yPos}^A0N,18,18^FD${sanitizeZpl(veld.label)}: ${sanitizeZpl(waarde)}^FS`;
      yPos += lineHeight - 8;
    } else {
      zpl += `^FO${xMargin},${yPos}^A0N,22,22^FD${sanitizeZpl(veld.label)}: ${sanitizeZpl(waarde)}^FS`;
      yPos += lineHeight;
    }
  }

  zpl += `^XZ`;
  return zpl;
}

function sanitizeZpl(str: string): string {
  return str.replace(/[\^~]/g, "");
}

export function generateTestZPL(config: PrintConfig): string {
  const now = new Date();
  const datum = `${now.getDate().toString().padStart(2, "0")}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getFullYear()}`;
  return generateZPL(
    {
      productnaam: "Nesto testprint",
      productie_datum: datum,
      houdbaar_tot: datum,
    },
    config,
    [
      { veld: "productnaam", label: "Product", actief: true, volgorde: 1 },
      { veld: "productie_datum", label: "Datum", actief: true, volgorde: 2 },
    ]
  );
}
