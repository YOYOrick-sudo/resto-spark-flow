import { useState } from "react";
import { PageHeader } from "@/components/polar/PageHeader";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { useInterneBestellingen, InterneBestelling } from "@/hooks/useInterneBestellingen";
import { InterneBestelPanel } from "@/components/interne-bestellingen/InterneBestelPanel";
import { NieuweAanvraagPanel } from "@/components/interne-bestellingen/NieuweAanvraagPanel";
import { Plus, ArrowDownLeft, ArrowUpRight, Package } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const statusVariant: Record<string, "default" | "primary" | "success" | "pending" | "warning" | "error"> = {
  aangevraagd: "pending",
  geaccepteerd: "primary",
  in_productie: "warning",
  verzonden: "primary",
  ontvangen: "success",
  geannuleerd: "error",
};

const statusLabel: Record<string, string> = {
  aangevraagd: "Aangevraagd",
  geaccepteerd: "Geaccepteerd",
  in_productie: "In productie",
  verzonden: "Verzonden",
  ontvangen: "Ontvangen",
  geannuleerd: "Geannuleerd",
};

function BestellingCard({
  bestelling,
  richting,
  onClick,
}: {
  bestelling: InterneBestelling;
  richting: "inkomend" | "uitgaand";
  onClick: () => void;
}) {
  const locatieNaam =
    richting === "inkomend"
      ? bestelling.van_location?.name ?? "Onbekend"
      : bestelling.naar_location?.name ?? "Onbekend";

  return (
    <NestoCard hoverable className="cursor-pointer" onClick={onClick}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {richting === "inkomend" ? (
            <ArrowDownLeft className="h-4 w-4 text-primary" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{locatieNaam}</span>
        </div>
        <NestoBadge variant={statusVariant[bestelling.status] ?? "default"}>
          {statusLabel[bestelling.status] ?? bestelling.status}
        </NestoBadge>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Package className="h-3.5 w-3.5" />
          {bestelling.regels.length} items
        </span>
        {bestelling.gewenste_datum && (
          <>
            <span>·</span>
            <span>
              Gewenst:{" "}
              {format(new Date(bestelling.gewenste_datum), "d MMM", { locale: nl })}
            </span>
          </>
        )}
      </div>
    </NestoCard>
  );
}

export default function InterneBestellingen() {
  const { data, isLoading } = useInterneBestellingen();
  const [selectedBestelling, setSelectedBestelling] = useState<InterneBestelling | null>(null);
  const [selectedRichting, setSelectedRichting] = useState<"inkomend" | "uitgaand">("inkomend");
  const [showNieuw, setShowNieuw] = useState(false);

  const inkomend = data?.inkomend ?? [];
  const uitgaand = data?.uitgaand ?? [];

  const actieveInkomend = inkomend.filter((b) => !["ontvangen", "geannuleerd"].includes(b.status));
  const actieveUitgaand = uitgaand.filter((b) => !["ontvangen", "geannuleerd"].includes(b.status));
  const afgerond = [...inkomend, ...uitgaand].filter((b) =>
    ["ontvangen", "geannuleerd"].includes(b.status)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interne Bestellingen"
        subtitle="Transfers tussen vestigingen"
        actions={[
          {
            label: "Nieuwe aanvraag",
            onClick: () => setShowNieuw(true),
            icon: Plus,
          },
        ]}
      />

      {/* INKOMEND */}
      <div>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-2">
          <ArrowDownLeft className="h-3.5 w-3.5" />
          Inkomend ({actieveInkomend.length})
        </h2>
        {actieveInkomend.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen inkomende aanvragen</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actieveInkomend.map((b) => (
              <BestellingCard
                key={b.id}
                bestelling={b}
                richting="inkomend"
                onClick={() => {
                  setSelectedBestelling(b);
                  setSelectedRichting("inkomend");
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* UITGAAND */}
      <div>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-2">
          <ArrowUpRight className="h-3.5 w-3.5" />
          Uitgaand ({actieveUitgaand.length})
        </h2>
        {actieveUitgaand.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen uitgaande aanvragen</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actieveUitgaand.map((b) => (
              <BestellingCard
                key={b.id}
                bestelling={b}
                richting="uitgaand"
                onClick={() => {
                  setSelectedBestelling(b);
                  setSelectedRichting("uitgaand");
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* AFGEROND */}
      {afgerond.length > 0 && (
        <div>
          <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
            Afgerond ({afgerond.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {afgerond.slice(0, 6).map((b) => (
              <BestellingCard
                key={b.id}
                bestelling={b}
                richting={
                  inkomend.some((ib) => ib.id === b.id) ? "inkomend" : "uitgaand"
                }
                onClick={() => {
                  setSelectedBestelling(b);
                  setSelectedRichting(
                    inkomend.some((ib) => ib.id === b.id) ? "inkomend" : "uitgaand"
                  );
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      <InterneBestelPanel
        open={!!selectedBestelling}
        onClose={() => setSelectedBestelling(null)}
        bestelling={selectedBestelling}
        richting={selectedRichting}
      />

      {/* Nieuwe Aanvraag Panel */}
      <NieuweAanvraagPanel
        open={showNieuw}
        onClose={() => setShowNieuw(false)}
      />
    </div>
  );
}
