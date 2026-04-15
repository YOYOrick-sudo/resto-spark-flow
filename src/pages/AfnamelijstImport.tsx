import { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, FileSpreadsheet, Check } from "lucide-react";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoSelect } from "@/components/polar";
import { Spinner } from "@/components/polar/LoadingStates";
import { useLeverancierDetail } from "@/hooks/useLeverancierDetail";
import {
  useAfnamelijstImport,
  type ImportRow,
} from "@/hooks/useAfnamelijstImport";
import { ImportPreviewRow } from "@/components/inkoop/ImportPreviewRow";
import {
  FIELD_LABELS,
  type MappableField,
} from "@/utils/csvColumnDetector";
import { cn } from "@/lib/utils";

const MAPPING_OPTIONS = Object.entries(FIELD_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function AfnamelijstImport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lev, isLoading } = useLeverancierDetail(id ?? null);

  const {
    headers,
    rawRows,
    columnMapping,
    importRows,
    parseFile,
    setColumnMapping,
    runMatching,
    setImportRows,
    executeImport,
  } = useAfnamelijstImport(id ?? "");

  const [step, setStep] = useState(0);
  const [options, setOptions] = useState({
    updatePrices: true,
    createNew: true,
  });

  const hasRequiredMappings = () => {
    const values = Object.values(columnMapping);
    return values.includes("artikel_naam") && values.includes("prijs_per_verpakking");
  };

  const handleFileSelect = useCallback(
    (file: File) => {
      parseFile(file);
      setStep(1);
    },
    [parseFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const goToPreview = async () => {
    await runMatching();
    setStep(2);
  };

  const handleImport = async () => {
    await executeImport.mutateAsync(options);
    navigate(`/inkoop/leveranciers/${id}`);
  };

  const updateRow = (index: number, updated: ImportRow) => {
    setImportRows((prev) =>
      prev.map((r) => (r.index === index ? updated : r))
    );
  };

  const counts = {
    matched: importRows.filter((r) => r.status === "matched" && r.checked).length,
    new: importRows.filter((r) => r.status === "new" && r.checked).length,
    skip: importRows.filter((r) => r.status === "skip" || !r.checked).length,
  };

  const [filter, setFilter] = useState<"all" | "matched" | "new" | "skip">("all");
  const filteredRows = importRows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "skip") return r.status === "skip" || !r.checked;
    return r.status === filter;
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  if (!lev) return null;

  const steps = [
    { label: "Upload" },
    { label: "Kolommen" },
    { label: "Controleer" },
  ];

  return (
    <div className="space-y-6 max-w-[960px] mx-auto">
      {/* Back link */}
      <Link
        to={`/inkoop/leveranciers/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Terug naar {lev.naam}
      </Link>

      <h1 className="text-xl font-semibold">Afnamelijst importeren</h1>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center">
            {i > 0 && (
              <div
                className={cn("h-[2px] w-8 sm:w-12", i <= step ? "bg-primary" : "bg-border")}
              />
            )}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                i === step && "bg-primary text-primary-foreground",
                i < step && "bg-primary/10 text-primary",
                i > step && "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Stap {step + 1} van 3: {steps[step].label}
      </p>

      {/* Step 1: Upload */}
      {step === 0 && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border/50 rounded-xl p-12 text-center hover:border-primary/40 transition-colors cursor-pointer"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".csv,.xlsx,.xls";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFileSelect(file);
              };
              input.click();
            }}
          >
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Sleep een CSV of Excel bestand hierheen</p>
            <p className="text-xs text-muted-foreground mt-1">of klik om te selecteren</p>
            <p className="text-xs text-muted-foreground mt-4">Ondersteund: .csv, .xlsx, .xls</p>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Tip: Exporteer de afnamelijst uit het bestelportaal van je leverancier als CSV of Excel.
          </p>
        </>
      )}

      {/* Step 2: Column mapping */}
      {step === 1 && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Wijs de kolommen toe aan de juiste velden:
          </p>

          <div className="space-y-2">
            {headers.map((header, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-40 truncate shrink-0">
                  Kolom {String.fromCharCode(65 + i)}: "{header}"
                </span>
                <span className="text-muted-foreground">→</span>
                <NestoSelect
                  value={columnMapping[i] ?? "overslaan"}
                  onValueChange={(v) =>
                    setColumnMapping((prev) => ({ ...prev, [i]: v as MappableField }))
                  }
                  options={MAPPING_OPTIONS}
                  className="w-52"
                />
              </div>
            ))}
          </div>

          {/* Preview table */}
          <div className="rounded-xl border border-border/50 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left text-xs text-muted-foreground font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 5).map((row, ri) => (
                  <tr key={ri} className="border-b border-border/10">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-xs truncate max-w-[150px]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between pt-4 border-t border-border/30">
            <NestoButton variant="outline" onClick={() => setStep(0)}>
              Vorige
            </NestoButton>
            <NestoButton onClick={goToPreview} disabled={!hasRequiredMappings()}>
              Volgende
            </NestoButton>
          </div>
        </div>
      )}

      {/* Step 3: Preview + import */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {importRows.length} regels gevonden · {counts.matched} gematcht · {counts.new} nieuw ·{" "}
            {counts.skip} overslaan
          </p>

          <div className="flex gap-2">
            {(["all", "matched", "new", "skip"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-lg transition-colors",
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {f === "all" && `Alle (${importRows.length})`}
                {f === "matched" && `Gematcht (${counts.matched})`}
                {f === "new" && `Nieuw (${counts.new})`}
                {f === "skip" && `Overslaan (${counts.skip})`}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
            {filteredRows.map((row) => (
              <ImportPreviewRow
                key={row.index}
                row={row}
                onChange={(updated) => updateRow(row.index, updated)}
              />
            ))}
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={options.updatePrices}
                onChange={(e) => setOptions((o) => ({ ...o, updatePrices: e.target.checked }))}
                className="rounded border-border"
              />
              Prijzen bijwerken voor gematchte ingrediënten
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={options.createNew}
                onChange={(e) => setOptions((o) => ({ ...o, createNew: e.target.checked }))}
                className="rounded border-border"
              />
              Nieuwe ingrediënten aanmaken voor ongematchte
            </label>
          </div>

          <div className="flex justify-between pt-4 border-t border-border/30">
            <NestoButton variant="outline" onClick={() => setStep(1)}>
              Vorige
            </NestoButton>
            <NestoButton
              onClick={handleImport}
              isLoading={executeImport.isPending}
            >
              {counts.matched + counts.new} artikelen importeren
            </NestoButton>
          </div>
        </div>
      )}
    </div>
  );
}
