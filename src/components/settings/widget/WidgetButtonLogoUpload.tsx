import { useCallback, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Trash2, Upload } from 'lucide-react';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useWidgetButtonLogoUpload } from '@/hooks/useWidgetButtonLogoUpload';

interface WidgetButtonLogoUploadProps {
  logoUrl: string | null;
}

export function WidgetButtonLogoUpload({ logoUrl }: WidgetButtonLogoUploadProps) {
  const { uploadLogo, deleteLogo, isUploading } = useWidgetButtonLogoUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (file) uploadLogo(file);
    },
    [uploadLogo],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  if (isUploading) {
    return (
      <div>
        <Label className="text-label text-muted-foreground mb-1.5">Button logo</Label>
        <Skeleton className="h-20 w-full rounded-card" />
        <p className="text-xs text-muted-foreground mt-1">Bezig met uploaden…</p>
      </div>
    );
  }

  if (logoUrl) {
    return (
      <div>
        <Label className="text-label text-muted-foreground mb-1.5">Button logo</Label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-16 px-4 border border-border rounded-card flex items-center gap-3 bg-background hover:bg-secondary/40 transition-colors cursor-pointer"
          >
            <img
              src={logoUrl}
              alt="Button logo"
              className="h-8 w-8 object-contain rounded"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <img
              src={logoUrl}
              alt="Button logo preview (dark)"
              className="h-8 w-8 object-contain rounded"
              style={{ filter: 'brightness(0) saturate(100%)', opacity: 0.85 }}
            />
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-control"
            title="Logo verwijderen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Het logo wordt automatisch donker gemaakt in de knop. Klik om te wijzigen.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Button logo verwijderen"
          description="Weet je zeker dat je het button logo wilt verwijderen? De standaard accent dot wordt weer getoond."
          confirmLabel="Verwijderen"
          variant="destructive"
          onConfirm={() => {
            setConfirmOpen(false);
            deleteLogo();
          }}
        />
      </div>
    );
  }

  // Empty state — drop zone
  return (
    <div>
      <Label className="text-label text-muted-foreground mb-1.5">Button logo</Label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`h-16 border border-dashed rounded-card flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-secondary/30'
        }`}
      >
        <Upload className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Upload een logo voor de floating knop
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        PNG, JPG of SVG. Max 2 MB. Wordt als donker silhouet getoond in de knop.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
