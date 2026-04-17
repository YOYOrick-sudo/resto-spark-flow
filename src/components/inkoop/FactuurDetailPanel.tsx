import { useState, useEffect, useMemo } from "react";
import { NestoPanel, NestoButton, NestoSelect, NestoBadge, Spinner, NestoDatePicker, dateFromString, dateToString } from "@/components/polar";
import { Input } from "@/components/ui/input";
import { useFactuurDetail } from "@/hooks/useFactuurDetail";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import { useLeveranciers } from "@/hooks/useLeveranciers";
import { FactuurRegelForm } from "./FactuurRegelForm";
import { LeverancierMatchWidget } from "./LeverancierMatchWidget";
import { IngredientMatchBadge, type NewIngredientPrefill } from "./IngredientMatchBadge";
import { NieuwIngredientFromFactuurModal } from "./NieuwIngredientFromFactuurModal";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, FileText, CheckCircle2 } from "lucide-react";

const STATUS_BADGES: Record<string, { variant: "default" | "warning" | "success" | "error"; label: string }> = {
  verwerken: { variant: "default", label: "Verwerken..." },
  review: { variant: "warning", label: "Review nodig" },
  goedgekeurd: { variant: "success", label: "Goedgekeurd" },
  afgewezen: { variant: "error", label: "Afgewezen" },
};

function FactuurPreview({ bestandUrl }: { bestandUrl: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const isPdf = bestandUrl.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    supabase.storage
      .from("facturen")
      .createSignedUrl(bestandUrl, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [bestandUrl]);

  if (!url) return null;

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-muted/20">
      {isPdf ? (
        <iframe src={url} className="w-full h-[400px]" title="Factuur preview" />
      ) : (
        <img src={url} alt="Factuur" className="w-full max-h-[400px] object-contain" />
      )}
    </div>
  );
}

// (InlineMatch verwijderd in R3 — vervangen door IngredientMatchBadge per regel)

function DetailContent({ factuurId }: { factuurId: string }) {
  const { data: factuur, isLoading } = useFactuurDetail(factuurId);
  const { updateFactuur, deleteRegel, goedkeuren, afwijzen, bulkConfirmHighConfidence } = useFactuurMutations();
  const { data: leveranciers } = useLeveranciers();
  const [addOpen, setAddOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [newIngState, setNewIngState] = useState<{ regelId: string; prefill: NewIngredientPrefill } | null>(null);

  // Local state for editable fields (onBlur saves)
  const [factuurnummer, setFactuurnummer] = useState("");
  const [factuurdatum, setFactuurdatum] = useState("");

  useEffect(() => {
    if (factuur) {
      setFactuurnummer(factuur.factuurnummer ?? "");
      setFactuurdatum(factuur.factuurdatum ?? "");
    }
  }, [factuur]);

  if (isLoading || !factuur)
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );

  const badge = STATUS_BADGES[factuur.status] ?? STATUS_BADGES.review;
  const isEditable = factuur.status === "review";
  const leverancierOptions = (leveranciers ?? []).map((l: any) => ({
    value: l.id,
    label: l.naam,
  }));

  const berekenTotaal = factuur.regels.reduce((s, r) => s + (r.totaal ?? 0), 0);

  return (
    <div className="px-5 py-6 space-y-6">
      {/* Status */}
      <div className="flex items-center gap-2">
        <NestoBadge variant={badge.variant}>{badge.label}</NestoBadge>
        <span className="text-xs text-muted-foreground">
          {new Date(factuur.created_at).toLocaleDateString("nl-NL")}
        </span>
      </div>

      {/* AI Match Widget */}
      <LeverancierMatchWidget
        factuurId={factuurId}
        aiStatus={(factuur as any).ai_parsing_status ?? null}
        herkendNaam={factuur.leverancier_naam_herkend}
        huidigeLeverancierId={factuur.leverancier_id}
        huidigeLeverancierNaam={
          (leveranciers ?? []).find((l: any) => l.id === factuur.leverancier_id)?.naam ?? null
        }
        aiConfidence={(factuur as any).ai_confidence_overall ?? null}
        rawResponse={(factuur as any).ai_raw_response ?? null}
      />

      {/* Preview */}
      <FactuurPreview bestandUrl={factuur.bestand_url} />

      {/* Factuurgegevens */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Factuurgegevens
        </h3>
        <NestoSelect
          label="Leverancier"
          value={factuur.leverancier_id ?? ""}
          onValueChange={(v) =>
            updateFactuur.mutate({ id: factuurId, leverancier_id: v })
          }
          options={leverancierOptions}
          disabled={!isEditable}
        />
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Factuurnummer
          </label>
          <Input
            value={factuurnummer}
            onChange={(e) => setFactuurnummer(e.target.value)}
            onBlur={() => {
              if (factuurnummer !== (factuur.factuurnummer ?? "")) {
                updateFactuur.mutate({ id: factuurId, factuurnummer });
              }
            }}
            disabled={!isEditable}
            className="h-9"
          />
        </div>
        <div>
          <NestoDatePicker
            label="Factuurdatum"
            value={dateFromString(factuurdatum)}
            onChange={(d) => {
              const str = dateToString(d);
              setFactuurdatum(str);
              if (str !== (factuur.factuurdatum ?? "")) {
                updateFactuur.mutate({ id: factuurId, factuurdatum: str || null });
              }
            }}
            disabled={!isEditable}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Totaalbedrag
          </label>
          <Input
            value={berekenTotaal ? `€${berekenTotaal.toFixed(2)}` : "€0,00"}
            readOnly
            className="h-9 bg-muted/30"
          />
        </div>
      </div>

      {/* Regels */}
      <FactuurRegelsSectie
        factuur={factuur}
        factuurId={factuurId}
        isEditable={isEditable}
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        reviewMode={reviewMode}
        setReviewMode={setReviewMode}
        onDeleteRegel={(id) => deleteRegel.mutate(id)}
        onBulkConfirm={(ids) => bulkConfirmHighConfidence.mutate(ids)}
        bulkPending={bulkConfirmHighConfidence.isPending}
        onOpenNewIngredient={(regelId, prefill) => setNewIngState({ regelId, prefill })}
      />

      <NieuwIngredientFromFactuurModal
        open={!!newIngState}
        onClose={() => setNewIngState(null)}
        regelId={newIngState?.regelId ?? null}
        prefill={newIngState?.prefill ?? null}
        leverancierId={factuur.leverancier_id}
      />

      {/* Acties */}
      {isEditable && (
        <div className="space-y-2 pt-4 border-t border-border/50">
          <NestoButton
            onClick={() => goedkeuren.mutate(factuurId)}
            isLoading={goedkeuren.isPending}
            className="w-full min-h-[44px]"
          >
            Goedkeuren & prijzen bijwerken
          </NestoButton>
          <NestoButton
            variant="outline"
            onClick={() => afwijzen.mutate(factuurId)}
            isLoading={afwijzen.isPending}
            className="w-full min-h-[44px] text-destructive hover:text-destructive"
          >
            Afwijzen
          </NestoButton>
        </div>
      )}
    </div>
  );
}

interface FactuurDetailPanelProps {
  factuurId: string | null;
  onClose: () => void;
}

export function FactuurDetailPanel({
  factuurId,
  onClose,
}: FactuurDetailPanelProps) {
  const { data: factuur } = useFactuurDetail(factuurId);

  if (!factuurId) return null;

  return (
    <NestoPanel open={!!factuurId} onClose={onClose} title="Factuur">
      {(titleRef) => (
        <div>
          <h2
            ref={titleRef}
            className="text-xl font-semibold px-5 pt-6 pb-2"
          >
            {factuur?.bestandsnaam ?? "Factuur"}
          </h2>
          <DetailContent factuurId={factuurId} />
        </div>
      )}
    </NestoPanel>
  );
}
