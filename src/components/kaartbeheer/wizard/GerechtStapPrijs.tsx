import * as React from "react";
import { useStepWizard } from "@/components/polar/StepWizard";
import { Input } from "@/components/ui/input";
import { NestoBadge } from "@/components/polar";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export function GerechtStapPrijs() {
  const { formData, setStepData } = useStepWizard();
  const { currentLocation } = useUserContext();
  const [uploading, setUploading] = React.useState(false);

  const data = formData.prijs ?? { verkoopprijs: "", foto_url: null };

  const update = (partial: Partial<typeof data>) => {
    setStepData("prijs", { ...data, ...partial });
  };

  // Calculate cost from linked recipes
  const recepten = formData.recepten?.items ?? [];
  const kostprijs = recepten.reduce(
    (sum: number, r: any) => sum + r.hoeveelheid * r.kostprijs_per_portie,
    0
  );

  const vkp = data.verkoopprijs ? parseFloat(data.verkoopprijs) : 0;
  const marge = vkp > 0 ? ((vkp - kostprijs) / vkp) * 100 : null;
  const foodCost = vkp > 0 ? (kostprijs / vkp) * 100 : null;

  const margeVariant = marge !== null ? (marge > 70 ? "success" : marge >= 60 ? "warning" : "error") : "default";
  const foodCostVariant = foodCost !== null ? (foodCost < 30 ? "success" : foodCost <= 35 ? "warning" : "error") : "default";

  const handleFileUpload = async (file: File) => {
    if (!currentLocation?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${currentLocation.id}/${crypto.randomUUID()}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("gerecht-fotos").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("gerecht-fotos").getPublicUrl(path);
      update({ foto_url: urlData.publicUrl });
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Foto uploaden mislukt");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFileUpload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Verkoopprijs (€)</label>
        <Input
          type="number"
          step="0.01"
          value={data.verkoopprijs}
          onChange={(e) => update({ verkoopprijs: e.target.value })}
          placeholder="0.00"
          className="h-12"
        />
      </div>

      {/* Cost summary */}
      <div className="rounded-xl border border-border/30 bg-muted/20 p-4 space-y-2">
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-muted-foreground">Kostprijs</span>
          <span className="text-right font-medium">
            {recepten.length > 0 ? `€${kostprijs.toFixed(2)}` : "—"}
          </span>
          <span className="text-muted-foreground">Marge</span>
          <span className="text-right">
            {marge !== null ? (
              <NestoBadge variant={margeVariant} size="sm">{marge.toFixed(1)}%</NestoBadge>
            ) : "—"}
          </span>
          <span className="text-muted-foreground">Food cost</span>
          <span className="text-right">
            {foodCost !== null ? (
              <NestoBadge variant={foodCostVariant} size="sm">{foodCost.toFixed(1)}%</NestoBadge>
            ) : "—"}
          </span>
        </div>
      </div>

      {/* Photo upload */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">
          Foto <span className="text-muted-foreground font-normal">(optioneel)</span>
        </label>
        {data.foto_url ? (
          <div className="relative rounded-xl overflow-hidden border border-border/30">
            <img src={data.foto_url} alt="Preview" className="w-full h-48 object-cover" />
            <button
              type="button"
              onClick={() => update({ foto_url: null })}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center gap-3 h-40 rounded-xl border-2 border-dashed border-border/50 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors"
          >
            {uploading ? (
              <span className="text-sm text-muted-foreground">Uploaden...</span>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">Sleep een foto hierheen of klik</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}
