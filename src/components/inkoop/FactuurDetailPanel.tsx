import { useState, useEffect } from "react";
import { NestoPanel, NestoButton, NestoSelect, NestoBadge, Spinner, NestoDatePicker, dateFromString, dateToString } from "@/components/polar";
import { Input } from "@/components/ui/input";
import { useFactuurDetail } from "@/hooks/useFactuurDetail";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import { useLeveranciers } from "@/hooks/useLeveranciers";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { FactuurRegelForm } from "./FactuurRegelForm";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Link, FileText } from "lucide-react";

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

function InlineMatch({ regelId, onMatched }: { regelId: string; onMatched: () => void }) {
  const { matchRegel } = useFactuurMutations();
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const { data: suggestions } = useIngredientSearch(search);

  return (
    <div className="relative mt-1">
      <Input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShow(true);
        }}
        placeholder="Zoek ingrediënt..."
        className="h-8 text-xs"
      />
      {show && suggestions && suggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-32 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 min-h-[44px]"
              onClick={() => {
                matchRegel.mutate(
                  { regelId, ingredientId: s.id },
                  {
                    onSuccess: () => {
                      setShow(false);
                      onMatched();
                    },
                  }
                );
              }}
            >
              {s.naam} <span className="text-muted-foreground">· {s.eenheid}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailContent({ factuurId }: { factuurId: string }) {
  const { data: factuur, isLoading } = useFactuurDetail(factuurId);
  const { updateFactuur, deleteRegel, goedkeuren, afwijzen } = useFactuurMutations();
  const { data: leveranciers } = useLeveranciers();
  const [addOpen, setAddOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);

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
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Regels ({factuur.regels.length})
          </h3>
          {isEditable && !addOpen && (
            <NestoButton
              variant="ghost"
              size="sm"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Toevoegen
            </NestoButton>
          )}
        </div>

        {addOpen && (
          <div className="mb-3">
            <FactuurRegelForm
              factuurId={factuurId}
              onDone={() => setAddOpen(false)}
            />
          </div>
        )}

        <div className="space-y-2">
          {factuur.regels.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border p-3 space-y-1 ${
                r.match_status === "niet_gematcht"
                  ? "border-warning/50 bg-warning/5"
                  : "border-border/30 bg-muted/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {r.product_naam_herkend}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.hoeveelheid ?? "-"} {r.eenheid ?? ""} · €
                    {r.prijs_per_eenheid?.toFixed(2) ?? "-"}/eh · €
                    {r.totaal?.toFixed(2) ?? "-"}
                  </p>
                  {r.ingredient_naam ? (
                    <p className="text-xs text-success flex items-center gap-1 mt-0.5">
                      <Link className="h-3 w-3" /> {r.ingredient_naam}
                    </p>
                  ) : (
                    <NestoBadge variant="warning" size="sm" className="mt-1">
                      Niet gekoppeld
                    </NestoBadge>
                  )}
                </div>
                {isEditable && (
                  <button
                    onClick={() => deleteRegel.mutate(r.id)}
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {isEditable &&
                r.match_status === "niet_gematcht" &&
                (editingMatch === r.id ? (
                  <InlineMatch
                    regelId={r.id}
                    onMatched={() => setEditingMatch(null)}
                  />
                ) : (
                  <NestoButton
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMatch(r.id)}
                    className="mt-1 min-h-[44px]"
                  >
                    <Link className="h-3.5 w-3.5 mr-1" /> Koppel ingrediënt
                  </NestoButton>
                ))}
            </div>
          ))}

          {factuur.regels.length === 0 && !addOpen && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nog geen regels. Voeg ze handmatig toe.
            </p>
          )}
        </div>
      </div>

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
