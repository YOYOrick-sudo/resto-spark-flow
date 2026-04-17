import * as React from "react";
import { Camera, X, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { nestoToast } from "@/lib/nestoToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const BUCKET = "taken-referenties";
const MAX_FOTOS = 5;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const SIGNED_TTL = 60 * 60 * 24 * 365; // 1 jaar

interface Props {
  locationId: string;
  itemId: string;
  fotoUrls: string[];
  onChange: (urls: string[]) => void;
}

/**
 * Extract storage path from a signed URL.
 * Signed URLs hebben de vorm: .../object/sign/{bucket}/{path}?token=...
 */
function extractPathFromSignedUrl(url: string): string | null {
  const match = url.match(/\/object\/sign\/[^/]+\/(.+?)(?:\?|$)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function ItemFotoUploader({ locationId, itemId, fotoUrls, onChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const count = fotoUrls.length;

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    if (count + files.length > MAX_FOTOS) {
      nestoToast.error(`Maximaal ${MAX_FOTOS} foto's per item`);
      return;
    }

    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of files) {
        if (file.size > MAX_SIZE) {
          nestoToast.error(`${file.name} is groter dan 5 MB`);
          continue;
        }
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          nestoToast.error(`${file.name}: alleen jpeg, png of webp toegestaan`);
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${locationId}/${itemId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (upErr) {
          nestoToast.error(`Upload mislukt: ${upErr.message}`);
          continue;
        }
        const { data: signed, error: signErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, SIGNED_TTL);
        if (signErr || !signed) {
          nestoToast.error(`Signed URL mislukt: ${signErr?.message}`);
          continue;
        }
        newUrls.push(signed.signedUrl);
      }
      if (newUrls.length > 0) {
        onChange([...fotoUrls, ...newUrls]);
        nestoToast.success(`${newUrls.length} foto('s) geüpload`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async (url: string) => {
    const path = extractPathFromSignedUrl(url);
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }
    onChange(fotoUrls.filter((u) => u !== url));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
            count > 0 && "text-primary"
          )}
          aria-label="Referentiefoto's beheren"
          title={count > 0 ? `${count} foto('s)` : "Foto's toevoegen"}
        >
          <Camera className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
              {count}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Referentiefoto's</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Voeg referentiefoto's toe (max {MAX_FOTOS} per item, max 5 MB elk). De kok ziet
            deze foto's tijdens het uitvoeren.
          </p>

          {fotoUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {fotoUrls.map((url) => (
                <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                  <img src={url} alt="Referentie" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemove(url)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-background/90 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Foto verwijderen"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleSelect}
              disabled={uploading || count >= MAX_FOTOS}
              className="hidden"
              id={`foto-upload-${itemId}`}
            />
            <label
              htmlFor={`foto-upload-${itemId}`}
              className={cn(
                "flex items-center justify-center gap-2 w-full py-3 px-4 rounded-button border-[1.5px] border-dashed border-border bg-card text-sm font-medium cursor-pointer transition-colors",
                uploading || count >= MAX_FOTOS
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-primary/50 hover:bg-accent/30"
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploaden…
                </>
              ) : count >= MAX_FOTOS ? (
                <>Maximum bereikt ({MAX_FOTOS} foto's)</>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Foto's uploaden
                </>
              )}
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
