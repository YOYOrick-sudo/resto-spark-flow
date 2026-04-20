import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NestoButton, NestoSelect } from "@/components/polar";
import { useCreateLeverancier } from "@/hooks/useLeveranciers";

interface Props {
  open: boolean;
  onClose: () => void;
  initialNaam?: string;
  onCreated: (leverancier: { id: string; naam: string }) => void;
}

const TYPE_OPTIONS = [
  { value: "wholesaler", label: "Groothandel" },
  { value: "lokaal", label: "Lokaal" },
  { value: "overig", label: "Overig" },
];

export function QuickCreateLeverancierDialog({
  open,
  onClose,
  initialNaam = "",
  onCreated,
}: Props) {
  const [naam, setNaam] = useState(initialNaam);
  const [type, setType] = useState<"wholesaler" | "lokaal" | "overig">("wholesaler");
  const [email, setEmail] = useState("");
  const createLev = useCreateLeverancier();

  // Reset velden als dialog opent met nieuwe initialNaam
  useEffect(() => {
    if (open) {
      setNaam(initialNaam);
      setType("wholesaler");
      setEmail("");
    }
  }, [open, initialNaam]);

  const canSubmit = naam.trim().length > 0 && !createLev.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createLev.mutate(
      { naam, type, email },
      {
        onSuccess: (lev) => {
          onCreated({ id: lev.id, naam: lev.naam });
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuwe leverancier</DialogTitle>
          <DialogDescription>
            Voeg snel een leverancier toe zonder de factuur te verlaten.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="qc-naam" className="text-xs text-muted-foreground mb-1 block">
              Naam *
            </Label>
            <Input
              id="qc-naam"
              autoFocus
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              placeholder="Bijv. Bidfood"
              className="h-9"
            />
          </div>

          <NestoSelect
            label="Type"
            value={type}
            onValueChange={(v) => setType(v as any)}
            options={TYPE_OPTIONS}
          />

          <div>
            <Label htmlFor="qc-email" className="text-xs text-muted-foreground mb-1 block">
              Email (optioneel)
            </Label>
            <Input
              id="qc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bestellingen@leverancier.nl"
              className="h-9"
            />
          </div>

          <DialogFooter className="gap-2">
            <NestoButton
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={createLev.isPending}
            >
              Annuleer
            </NestoButton>
            <NestoButton type="submit" disabled={!canSubmit} isLoading={createLev.isPending}>
              Aanmaken
            </NestoButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
