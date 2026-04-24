import * as React from "react";
import { Sparkles, ShieldCheck } from "lucide-react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoButton } from "@/components/polar/NestoButton";
import { useUserContext } from "@/contexts/UserContext";

const VERSION = "v1";
const STORAGE_KEY_PREFIX = "nesto:pakbon-ai-disclaimer-seen";

function storageKey(locationId: string) {
  return `${STORAGE_KEY_PREFIX}:${VERSION}:${locationId}`;
}

/**
 * Eerste-bezoek disclaimer voor de pakbon-flow.
 * Dismiss persisteert in localStorage per location, met versie-tag.
 * Bump VERSION naar 'v2' bij tekstwijziging om iedereen opnieuw te tonen.
 */
export function PakbonAIDisclaimerModal() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!locationId) return;
    try {
      const seen = localStorage.getItem(storageKey(locationId));
      if (!seen) setOpen(true);
    } catch {
      // localStorage geblokkeerd: toon nooit (geen blocker)
    }
  }, [locationId]);

  const handleDismiss = () => {
    if (locationId) {
      try {
        localStorage.setItem(storageKey(locationId), new Date().toISOString());
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleDismiss();
      }}
      icon={<Sparkles className="h-5 w-5 text-primary" />}
      title="Slimme pakbon-controle"
      size="md"
      footer={
        <div className="flex justify-end w-full px-6 pb-6">
          <NestoButton onClick={handleDismiss} className="min-h-[48px] px-6">
            Begrepen, aan de slag
          </NestoButton>
        </div>
      }
    >
      <div className="px-6 pb-2 space-y-4 text-body text-foreground leading-relaxed">
        <p>
          Pakbonnen worden automatisch ingelezen door AI. Wij herkennen
          producten, hoeveelheden en koppelen ze aan jouw ingrediënten. Jij
          bevestigt of de levering klopt.
        </p>

        <div className="rounded-xl bg-muted/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Wat verwachten wij van jou?
          </div>
          <ul className="text-small text-muted-foreground space-y-1.5 ml-6 list-disc">
            <li>Controleer of de regels kloppen met de fysieke levering</li>
            <li>Vink afwijkingen aan (te weinig, beschadigd, verkeerd)</li>
            <li>Meet en noteer temperaturen voor gekoelde of vries-producten</li>
            <li>Bevestig de levering — daarna komt het op voorraad</li>
          </ul>
        </div>

        <p className="text-small text-muted-foreground">
          Twijfel je over een product? Voeg een notitie toe — de manager kan
          later corrigeren.
        </p>
      </div>
    </NestoModal>
  );
}
