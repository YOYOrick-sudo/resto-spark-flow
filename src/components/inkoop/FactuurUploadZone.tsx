import { useState, useCallback } from "react";
import { Upload, FileText } from "lucide-react";
import { NestoButton, NestoSelect } from "@/components/polar";
import { useLeveranciers } from "@/hooks/useLeveranciers";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import { toast } from "sonner";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = 10 * 1024 * 1024;

export function FactuurUploadZone() {
  const { data: leveranciers } = useLeveranciers();
  const { uploadFactuur } = useFactuurMutations();
  const [file, setFile] = useState<File | null>(null);
  const [leverancierId, setLeverancierId] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handmatigeLeveranciers = (leveranciers ?? []).filter(
    (l: any) => !l.koppeling_type || l.koppeling_type === "handmatig"
  );

  const leverancierOptions = handmatigeLeveranciers.map((l: any) => ({
    value: l.id,
    label: l.naam,
  }));

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error("Alleen PDF, JPG of PNG bestanden zijn toegestaan");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("Bestand is te groot (max 10MB)");
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

  const handleUpload = () => {
    if (!file || !leverancierId) return;
    uploadFactuur.mutate(
      { file, leverancierId },
      {
        onSuccess: () => {
          setFile(null);
          setLeverancierId("");
        },
      }
    );
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
          <p className="text-xs text-muted-foreground mt-1">
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
              onClick={() => setFile(null)}
              className="ml-auto shrink-0"
            >
              Wijzig
            </NestoButton>
          </div>

          <NestoSelect
            label="Van welke leverancier is deze factuur?"
            value={leverancierId}
            onValueChange={setLeverancierId}
            options={leverancierOptions}
            placeholder="Selecteer leverancier..."
          />

          <NestoButton
            onClick={handleUpload}
            disabled={!leverancierId}
            isLoading={uploadFactuur.isPending}
            className="w-full min-h-[44px]"
          >
            Factuur uploaden
          </NestoButton>
        </div>
      )}
    </div>
  );
}
