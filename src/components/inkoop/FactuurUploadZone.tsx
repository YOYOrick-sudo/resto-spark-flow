import { useState, useCallback } from "react";
import { Upload, FileText, Sparkles } from "lucide-react";
import { NestoButton, NestoSelect } from "@/components/polar";
import { useLeveranciers } from "@/hooks/useLeveranciers";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { nestoToast } from "@/lib/nestoToast";
import { sha256Hex } from "@/lib/fileHash";
import {
  DuplicateFactuurDialog,
  type DuplicateFactuurInfo,
} from "./DuplicateFactuurDialog";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = 10 * 1024 * 1024;

export function FactuurUploadZone() {
  const { data: leveranciers } = useLeveranciers();
  const { uploadFactuur } = useFactuurMutations();
  const { currentLocation } = useUserContext();
  const [file, setFile] = useState<File | null>(null);
  const [leverancierId, setLeverancierId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [checking, setChecking] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateFactuurInfo | null>(null);
  const [pendingHash, setPendingHash] = useState<string | null>(null);

  const handmatigeLeveranciers = (leveranciers ?? []).filter(
    (l: any) => !l.koppeling_type || l.koppeling_type === "handmatig"
  );

  const leverancierOptions = [
    { value: "", label: "AI laat herkennen" },
    ...handmatigeLeveranciers.map((l: any) => ({
      value: l.id,
      label: l.naam,
    })),
  ];

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!ACCEPTED_TYPES.includes(f.type)) {
      nestoToast.error("Alleen PDF, JPG of PNG bestanden zijn toegestaan");
      return;
    }
    if (f.size > MAX_SIZE) {
      nestoToast.error("Bestand is te groot (max 10MB)");
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const reset = () => {
    setFile(null);
    setLeverancierId("");
    setPendingHash(null);
  };

  const doUpload = (hash: string | null) => {
    if (!file) return;
    uploadFactuur.mutate(
      { file, leverancierId: leverancierId || undefined, fileHash: hash ?? undefined },
      { onSuccess: reset }
    );
  };

  const handleUpload = async () => {
    if (!file || !currentLocation?.id) return;

    setChecking(true);
    try {
      const hash = await sha256Hex(file);
      setPendingHash(hash);

      // Check duplicate per locatie
      const { data: existing, error } = await supabase
        .from("factuur_uploads")
        .select(
          "id, status, factuurnummer, factuurdatum, created_at, leveranciers(naam)"
        )
        .eq("location_id", currentLocation.id)
        .eq("file_hash", hash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("[hash check] failed, proceeding with upload:", error);
        doUpload(hash);
        return;
      }

      if (existing) {
        setDuplicate({
          id: existing.id,
          status: existing.status,
          factuurnummer: existing.factuurnummer,
          factuurdatum: existing.factuurdatum,
          created_at: existing.created_at,
          leverancier_naam: (existing as any).leveranciers?.naam ?? null,
        });
        return;
      }

      doUpload(hash);
    } catch (e) {
      console.error("[hash check] exception:", e);
      doUpload(null);
    } finally {
      setChecking(false);
    }
  };

  const handleForceUpload = () => {
    setDuplicate(null);
    doUpload(pendingHash);
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border/50 hover:border-border"
          }`}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf,.jpg,.jpeg,.png";
            input.onchange = (e) =>
              handleFiles((e.target as HTMLInputElement).files);
            input.click();
          }}
        >
          <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">Sleep een factuur hierheen</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
            <Sparkles className="h-3 w-3" /> AI herkent automatisch leverancier en regels
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            PDF, JPG of PNG · max 10MB
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <NestoButton
              variant="ghost"
              size="sm"
              onClick={reset}
              className="ml-auto shrink-0"
            >
              Wijzig
            </NestoButton>
          </div>

          <NestoSelect
            label="Leverancier (optioneel)"
            value={leverancierId}
            onValueChange={setLeverancierId}
            options={leverancierOptions}
            placeholder="AI laat herkennen"
          />

          <NestoButton
            onClick={handleUpload}
            disabled={!file}
            isLoading={checking || uploadFactuur.isPending}
            className="w-full min-h-[44px]"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Upload & laat AI lezen
          </NestoButton>
        </div>
      )}

      <DuplicateFactuurDialog
        open={!!duplicate}
        existing={duplicate}
        onCancel={() => setDuplicate(null)}
        onForce={handleForceUpload}
      />
    </div>
  );
}
