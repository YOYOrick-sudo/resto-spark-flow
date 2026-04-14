import { useState } from "react";
import { NestoPanel } from "@/components/polar/NestoPanel";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { Input } from "@/components/ui/input";
import { InterneBestelling } from "@/hooks/useInterneBestellingen";
import { useInterneBestellingMutations } from "@/hooks/useInterneBestellingMutations";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Check, Truck, PackageCheck, X } from "lucide-react";

const statusLabel: Record<string, string> = {
  aangevraagd: "Aangevraagd",
  geaccepteerd: "Geaccepteerd",
  in_productie: "In productie",
  verzonden: "Verzonden",
  ontvangen: "Ontvangen",
  geannuleerd: "Geannuleerd",
};

interface Props {
  open: boolean;
  onClose: () => void;
  bestelling: InterneBestelling | null;
  richting: "inkomend" | "uitgaand";
}

export function InterneBestelPanel({ open, onClose, bestelling, richting }: Props) {
  const { updateStatus, updateRegelHoeveelheden } = useInterneBestellingMutations();
  const [hoeveelheden, setHoeveelheden] = useState<Record<string, string>>({});

  if (!bestelling) return null;

  // uitgaand = van mijn locatie (ik lever), inkomend = naar mijn locatie (ik ontvang)
  const isUitgaand = richting === "uitgaand";
  const titel = isUitgaand
    ? `Naar ${bestelling.naar_location?.name}`
    : `Van ${bestelling.van_location?.name}`;

  const handleWithHoeveelheden = async (field: string, nextStatus: string) => {
    const updates = bestelling.regels
      .filter((r) => hoeveelheden[r.id])
      .map((r) => ({
        id: r.id,
        field,
        value: parseFloat(hoeveelheden[r.id]),
      }));
    if (updates.length > 0) {
      await updateRegelHoeveelheden.mutateAsync(updates);
    }
    await updateStatus.mutateAsync({ id: bestelling.id, status: nextStatus });
    setHoeveelheden({});
    onClose();
  };

  const renderFooter = () => {
    const s = bestelling.status;

    if (isUitgaand) {
      if (s === "aangevraagd") {
        return (
          <div className="flex gap-2">
            <NestoButton
              variant="ghost"
              onClick={() => handleWithHoeveelheden("geaccepteerde_hoeveelheid", "geannuleerd")}
              className="min-h-[44px]"
            >
              <X className="h-4 w-4 mr-1" /> Weigeren
            </NestoButton>
            <NestoButton
              variant="primary"
              onClick={() => handleWithHoeveelheden("geaccepteerde_hoeveelheid", "geaccepteerd")}
              className="min-h-[48px] flex-1"
              disabled={updateStatus.isPending}
            >
              <Check className="h-4 w-4 mr-1" /> Accepteren
            </NestoButton>
          </div>
        );
      }
      if (s === "geaccepteerd" || s === "in_productie") {
        return (
          <NestoButton
            variant="primary"
            onClick={() => handleWithHoeveelheden("verzonden_hoeveelheid", "verzonden")}
            className="w-full min-h-[48px]"
            disabled={updateStatus.isPending}
          >
            <Truck className="h-4 w-4 mr-1" /> Markeer als verzonden
          </NestoButton>
        );
      }
    } else {
      if (s === "verzonden") {
        return (
          <NestoButton
            variant="primary"
            onClick={() => handleWithHoeveelheden("ontvangen_hoeveelheid", "ontvangen")}
            className="w-full min-h-[48px]"
            disabled={updateStatus.isPending}
          >
            <PackageCheck className="h-4 w-4 mr-1" /> Ontvangen
          </NestoButton>
        );
      }
    }

    return null;
  };

  const editableField = (() => {
    if (isUitgaand && bestelling.status === "aangevraagd") return "geaccepteerde_hoeveelheid";
    if (isUitgaand && ["geaccepteerd", "in_productie"].includes(bestelling.status))
      return "verzonden_hoeveelheid";
    if (!isUitgaand && bestelling.status === "verzonden") return "ontvangen_hoeveelheid";
    return null;
  })();

  return (
    <NestoPanel
      open={open}
      onClose={() => { setHoeveelheden({}); onClose(); }}
      title={`Transfer · ${titel}`}
      footer={renderFooter()}
    >
      {(titleRef) => (
        <div className="px-5 py-6">
          <h2 ref={titleRef} className="text-h2 mb-1">{titel}</h2>
          <div className="flex items-center gap-2 mb-6">
            <NestoBadge variant={bestelling.status === "ontvangen" ? "success" : "pending"}>
              {statusLabel[bestelling.status]}
            </NestoBadge>
            {bestelling.gewenste_datum && (
              <span className="text-sm text-muted-foreground">
                Gewenst: {format(new Date(bestelling.gewenste_datum), "d MMMM yyyy", { locale: nl })}
              </span>
            )}
          </div>

          {/* Regels */}
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Items ({bestelling.regels.length})
            </p>
            {bestelling.regels.map((regel) => (
              <div
                key={regel.id}
                className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{regel.omschrijving}</p>
                  <p className="text-xs text-muted-foreground">
                    Gevraagd: {regel.gevraagde_hoeveelheid} {regel.eenheid}
                    {regel.geaccepteerde_hoeveelheid != null &&
                      ` · Geaccepteerd: ${regel.geaccepteerde_hoeveelheid}`}
                    {regel.verzonden_hoeveelheid != null &&
                      ` · Verzonden: ${regel.verzonden_hoeveelheid}`}
                    {regel.ontvangen_hoeveelheid != null &&
                      ` · Ontvangen: ${regel.ontvangen_hoeveelheid}`}
                  </p>
                </div>
                {editableField && (
                  <div className="w-20 ml-3">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={String(regel.gevraagde_hoeveelheid)}
                      value={hoeveelheden[regel.id] ?? ""}
                      onChange={(e) =>
                        setHoeveelheden((prev) => ({
                          ...prev,
                          [regel.id]: e.target.value,
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Notities */}
          {bestelling.notities && (
            <div className="border-t border-border/50 pt-4 mt-6">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Notities
              </p>
              <p className="text-sm text-muted-foreground">{bestelling.notities}</p>
            </div>
          )}

          {/* Tijdlijn */}
          <div className="border-t border-border/50 pt-4 mt-6">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Tijdlijn
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Aangevraagd: {format(new Date(bestelling.aangevraagd_op), "d MMM HH:mm", { locale: nl })}</p>
              {bestelling.geaccepteerd_op && (
                <p>Geaccepteerd: {format(new Date(bestelling.geaccepteerd_op), "d MMM HH:mm", { locale: nl })}</p>
              )}
              {bestelling.verzonden_op && (
                <p>Verzonden: {format(new Date(bestelling.verzonden_op), "d MMM HH:mm", { locale: nl })}</p>
              )}
              {bestelling.ontvangen_op && (
                <p>Ontvangen: {format(new Date(bestelling.ontvangen_op), "d MMM HH:mm", { locale: nl })}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </NestoPanel>
  );
}
