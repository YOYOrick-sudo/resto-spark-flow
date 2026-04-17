import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { NestoButton, NestoBadge } from "@/components/polar";
import { AlertTriangle } from "lucide-react";

export interface DuplicateFactuurInfo {
  id: string;
  status: string;
  factuurnummer: string | null;
  factuurdatum: string | null;
  leverancier_naam: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  verwerken: "Verwerken",
  review: "Review nodig",
  goedgekeurd: "Goedgekeurd",
  afgewezen: "Afgewezen",
};

interface Props {
  open: boolean;
  existing: DuplicateFactuurInfo | null;
  onCancel: () => void;
  onForce: () => void;
}

export function DuplicateFactuurDialog({ open, existing, onCancel, onForce }: Props) {
  const navigate = useNavigate();

  if (!existing) return null;

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleView = () => {
    onCancel();
    navigate(`/inkoop/facturen/${existing.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <DialogTitle>Deze factuur lijkt al geüpload</DialogTitle>
          </div>
          <DialogDescription>
            We vonden een eerdere upload met dezelfde inhoud (SHA-256 match).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Geüpload op</span>
            <span className="font-medium">{formatDate(existing.created_at)}</span>
          </div>
          {existing.leverancier_naam && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Leverancier</span>
              <span className="font-medium truncate">{existing.leverancier_naam}</span>
            </div>
          )}
          {existing.factuurnummer && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Factuurnummer</span>
              <span className="font-medium">#{existing.factuurnummer}</span>
            </div>
          )}
          {existing.factuurdatum && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Factuurdatum</span>
              <span className="font-medium">{formatDate(existing.factuurdatum)}</span>
            </div>
          )}
          <div className="flex justify-between gap-4 items-center">
            <span className="text-muted-foreground">Status</span>
            <NestoBadge variant="default">
              {STATUS_LABEL[existing.status] ?? existing.status}
            </NestoBadge>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <NestoButton variant="ghost" onClick={onForce}>
            Toch opnieuw uploaden
          </NestoButton>
          <NestoButton onClick={handleView}>Bekijk bestaande factuur</NestoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
