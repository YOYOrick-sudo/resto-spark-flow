import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  type MappableField,
  detectColumnMapping,
  detectDelimiter,
  parsePrice,
  SKIP_PATTERNS,
} from "@/utils/csvColumnDetector";

export interface ParsedRow {
  raw: string[];
  mapped: {
    artikel_naam: string;
    artikel_nummer?: string;
    verpakking_hoeveelheid?: number;
    verpakking_eenheid?: string;
    prijs_per_verpakking?: number;
    categorie?: string;
    ean_code?: string;
  };
}

export interface MatchedIngredient {
  id: string;
  naam: string;
  eenheid: string;
  kostprijs: number | null;
  categorie: string;
}

export type MatchConfidence = "high" | "medium" | "none";
export type RowStatus = "matched" | "new" | "skip";

export interface ImportRow {
  index: number;
  parsed: ParsedRow;
  status: RowStatus;
  confidence: MatchConfidence;
  matchedIngredient: MatchedIngredient | null;
  checked: boolean;
  newCategorie: string;
  newEenheid: string;
}

export interface ImportOptions {
  updatePrices: boolean;
  createNew: boolean;
}

export function useAfnamelijstImport(leverancierId: string) {
  const { currentLocation } = useUserContext();
  const locId = currentLocation?.id;
  const qc = useQueryClient();

  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, MappableField>>({});
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv" || ext === "txt") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const delimiter = detectDelimiter(text);
        const result = Papa.parse<string[]>(text, {
          delimiter,
          skipEmptyLines: true,
        });
        if (result.data.length > 1) {
          setHeaders(result.data[0]);
          setRawRows(result.data.slice(1));
          setColumnMapping(detectColumnMapping(result.data[0]));
        }
      };
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
        if (data.length > 1) {
          const headerRow = data[0].map(String);
          setHeaders(headerRow);
          setRawRows(data.slice(1).map((r) => r.map(String)));
          setColumnMapping(detectColumnMapping(headerRow));
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const applyMapping = useCallback(() => {
    const getField = (row: string[], field: MappableField): string | undefined => {
      const idx = Object.entries(columnMapping).find(([, f]) => f === field)?.[0];
      return idx != null ? row[Number(idx)]?.trim() : undefined;
    };

    return rawRows
      .map((row) => ({
        raw: row,
        mapped: {
          artikel_naam: getField(row, "artikel_naam") ?? "",
          artikel_nummer: getField(row, "artikel_nummer"),
          verpakking_hoeveelheid: (() => {
            const v = getField(row, "verpakking_hoeveelheid");
            return v ? parsePrice(v) ?? undefined : undefined;
          })(),
          verpakking_eenheid: getField(row, "verpakking_eenheid"),
          prijs_per_verpakking: (() => {
            const v = getField(row, "prijs_per_verpakking");
            return v ? parsePrice(v) ?? undefined : undefined;
          })(),
          categorie: getField(row, "categorie"),
          ean_code: getField(row, "ean_code"),
        },
      }))
      .filter((r) => r.mapped.artikel_naam.length > 0);
  }, [rawRows, columnMapping]);

  const runMatching = useCallback(async () => {
    if (!locId) return;

    const parsed = applyMapping();

    const { data: ingredients } = await supabase
      .from("ingredienten")
      .select("id, naam, eenheid, kostprijs, categorie")
      .eq("location_id", locId)
      .eq("is_archived", false);

    const { data: existingArtikelen } = await supabase
      .from("leveranciers_artikelen")
      .select("id, artikel_nummer, ingredient_id, artikel_naam")
      .eq("leverancier_id", leverancierId);

    const ingredientMap = new Map(
      (ingredients ?? []).map((i) => [i.naam.toLowerCase(), i])
    );

    const artikelNummerMap = new Map(
      (existingArtikelen ?? [])
        .filter((a) => a.artikel_nummer)
        .map((a) => [a.artikel_nummer!, a])
    );

    const rows: ImportRow[] = parsed.map((p, index) => {
      const naam = p.mapped.artikel_naam;

      if (SKIP_PATTERNS.test(naam)) {
        return {
          index, parsed: p, status: "skip" as RowStatus,
          confidence: "none" as MatchConfidence, matchedIngredient: null,
          checked: false, newCategorie: p.mapped.categorie ?? "Overig",
          newEenheid: p.mapped.verpakking_eenheid ?? "kg",
        };
      }

      // Re-import: match on artikel_nummer
      if (p.mapped.artikel_nummer) {
        const existing = artikelNummerMap.get(p.mapped.artikel_nummer);
        if (existing) {
          const ing = (ingredients ?? []).find((i) => i.id === existing.ingredient_id);
          if (ing) {
            return {
              index, parsed: p, status: "matched" as RowStatus,
              confidence: "high" as MatchConfidence, matchedIngredient: ing,
              checked: true, newCategorie: ing.categorie, newEenheid: ing.eenheid,
            };
          }
        }
      }

      // Exact name match
      const exact = ingredientMap.get(naam.toLowerCase());
      if (exact) {
        return {
          index, parsed: p, status: "matched" as RowStatus,
          confidence: "high" as MatchConfidence, matchedIngredient: exact,
          checked: true, newCategorie: exact.categorie, newEenheid: exact.eenheid,
        };
      }

      // Fuzzy: first word match
      const firstWord = naam.split(/\s+/)[0]?.toLowerCase();
      if (firstWord && firstWord.length > 2) {
        const fuzzyMatches = (ingredients ?? []).filter((i) =>
          i.naam.toLowerCase().includes(firstWord)
        );
        if (fuzzyMatches.length >= 1) {
          const sorted = fuzzyMatches.sort(
            (a, b) =>
              Math.abs(a.naam.length - naam.length) -
              Math.abs(b.naam.length - naam.length)
          );
          return {
            index, parsed: p, status: "matched" as RowStatus,
            confidence: (fuzzyMatches.length === 1 ? "medium" : "medium") as MatchConfidence,
            matchedIngredient: sorted[0], checked: true,
            newCategorie: sorted[0].categorie, newEenheid: sorted[0].eenheid,
          };
        }
      }

      return {
        index, parsed: p, status: "new" as RowStatus,
        confidence: "none" as MatchConfidence, matchedIngredient: null,
        checked: true, newCategorie: p.mapped.categorie ?? "Overig",
        newEenheid: p.mapped.verpakking_eenheid ?? "kg",
      };
    });

    setImportRows(rows);
  }, [locId, leverancierId, applyMapping]);

  const executeImport = useMutation({
    mutationFn: async (options: ImportOptions) => {
      if (!locId) throw new Error("Geen locatie");

      const checkedRows = importRows.filter((r) => r.checked);
      const matched = checkedRows.filter((r) => r.status === "matched");
      const newRows = checkedRows.filter((r) => r.status === "new");
      const skipped = importRows.filter((r) => !r.checked || r.status === "skip");

      let updated = 0;
      let created = 0;

      for (const row of matched) {
        if (!row.matchedIngredient) continue;
        const m = row.parsed.mapped;

        const { error } = await supabase
          .from("leveranciers_artikelen")
          .upsert(
            {
              leverancier_id: leverancierId,
              ingredient_id: row.matchedIngredient.id,
              artikel_naam: m.artikel_naam,
              artikel_nummer: m.artikel_nummer ?? null,
              verpakking_hoeveelheid: m.verpakking_hoeveelheid ?? null,
              verpakking_eenheid: m.verpakking_eenheid ?? null,
              prijs_per_verpakking: m.prijs_per_verpakking ?? null,
              ean_code: m.ean_code ?? null,
              import_bestandsnaam: fileName,
              laatst_geimporteerd: new Date().toISOString(),
            } as any,
            { onConflict: "leverancier_id,ingredient_id" }
          );
        if (error) {
          console.error("[afnamelijst] leveranciers_artikelen upsert error:", error);
          throw new Error(`Import mislukt voor "${m.artikel_naam}": ${error.message}`);
        }

        if (options.updatePrices && m.prijs_per_verpakking != null) {
          const kostprijs =
            m.verpakking_hoeveelheid && m.verpakking_hoeveelheid > 0
              ? m.prijs_per_verpakking / m.verpakking_hoeveelheid
              : m.prijs_per_verpakking;

          await supabase
            .from("ingredienten")
            .update({
              kostprijs,
              kostprijs_bron: "import",
              kostprijs_laatst_bijgewerkt: new Date().toISOString(),
            })
            .eq("id", row.matchedIngredient.id);
        }

        updated++;
      }

      if (options.createNew) {
        for (const row of newRows) {
          const m = row.parsed.mapped;

          const kostprijs =
            m.prijs_per_verpakking != null && m.verpakking_hoeveelheid && m.verpakking_hoeveelheid > 0
              ? m.prijs_per_verpakking / m.verpakking_hoeveelheid
              : m.prijs_per_verpakking ?? null;

          const { data: newIng, error: ingError } = await supabase
            .from("ingredienten")
            .insert({
              location_id: locId,
              naam: m.artikel_naam,
              categorie: row.newCategorie,
              eenheid: row.newEenheid,
              kostprijs,
              kostprijs_bron: "import",
              kostprijs_laatst_bijgewerkt: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (ingError) {
            console.error("Ingredient create error:", ingError);
            continue;
          }

          await supabase.from("leveranciers_artikelen").insert({
            leverancier_id: leverancierId,
            ingredient_id: newIng.id,
            artikel_naam: m.artikel_naam,
            artikel_nummer: m.artikel_nummer ?? null,
            verpakking_hoeveelheid: m.verpakking_hoeveelheid ?? null,
            verpakking_eenheid: m.verpakking_eenheid ?? null,
            prijs_per_verpakking: m.prijs_per_verpakking ?? null,
            ean_code: m.ean_code ?? null,
            import_bestandsnaam: fileName,
            laatst_geimporteerd: new Date().toISOString(),
          } as any);

          created++;
        }
      }

      return { updated, created, skipped: skipped.length };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["leverancier-detail"] });
      qc.invalidateQueries({ queryKey: ["ingredienten"] });
      nestoToast.success(
        `${result.updated + result.created} artikelen geïmporteerd: ${result.updated} bijgewerkt, ${result.created} nieuw aangemaakt, ${result.skipped} overgeslagen`
      );
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  return {
    headers, rawRows, columnMapping, importRows, fileName,
    parseFile, setColumnMapping, runMatching, setImportRows, executeImport,
  };
}
