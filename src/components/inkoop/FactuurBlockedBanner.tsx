/**
 * Sprint Factuur Enterprise Pass — FactuurBlockedBanner
 *
 * Read-only banner getoond bovenaan FactuurDetailPage wanneer
 * status === 'review_blocked'. Geeft chef-leesbare uitleg + CTA terug
 * naar facturen-overzicht. Geen inhoudelijke acties beschikbaar:
 * een manager moet de bedragen handmatig nakijken.
 */
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NestoButton } from "@/components/polar";

interface Props {
  reason: string | null;
  retries: number;
}

export function FactuurBlockedBanner({ reason, retries }: Props) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/5 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
          <ShieldAlert className="h-5 w-5 text-warning" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            Factuur wacht op controle door een manager
          </h2>
          <p className="text-sm text-muted-foreground">
            {reason ??
              "Deze factuur kon niet automatisch worden gevalideerd. Een manager moet de bedragen handmatig nakijken voordat verwerking mogelijk is."}
          </p>
          {retries > 0 && (
            <p className="text-xs text-muted-foreground/80">
              Automatische hercontrole geprobeerd: {retries}× — geen verbetering.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs text-muted-foreground">
          Kostprijzen worden niet bijgewerkt zolang deze status actief is.
        </p>
        <NestoButton
          variant="outline"
          size="sm"
          onClick={() => navigate("/inkoop")}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Terug naar facturen
        </NestoButton>
      </div>
    </div>
  );
}
