import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NestoSelect, NestoBadge, Spinner, EmptyState } from "@/components/polar";
import { useFactuurUploads } from "@/hooks/useFactuurUploads";
import { useLeveranciers } from "@/hooks/useLeveranciers";
import { FactuurUploadZone } from "./FactuurUploadZone";
import { FileText, Lightbulb, Sparkles } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "Alle statussen" },
  { value: "verwerken", label: "Verwerken" },
  { value: "review", label: "Review nodig" },
  { value: "goedgekeurd", label: "Goedgekeurd" },
  { value: "afgewezen", label: "Afgewezen" },
];

const STATUS_BADGES: Record<string, { variant: "default" | "warning" | "success" | "error"; label: string }> = {
  verwerken: { variant: "default", label: "Verwerken..." },
  review: { variant: "warning", label: "Review nodig" },
  goedgekeurd: { variant: "success", label: "Goedgekeurd" },
  afgewezen: { variant: "error", label: "Afgewezen" },
};

// Mapping onderscheidt "In wachtrij" (pending — net geüpload, nog niet opgepakt)
// van "Verwerken..." (processing — AI is actief bezig). Helpt chef inschatten.
const AI_BADGES: Record<string, { variant: "default" | "warning" | "success" | "error"; label: string }> = {
  pending: { variant: "default", label: "In wachtrij" },
  processing: { variant: "warning", label: "Verwerken..." },
  completed: { variant: "success", label: "AI klaar" },
  failed: { variant: "error", label: "AI gefaald" },
};

export function FacturenTab() {
  const [statusFilter, setStatusFilter] = useState("");
  const [leverancierFilter, setLeverancierFilter] = useState("");
  const navigate = useNavigate();

  const { data: facturen, isLoading } = useFactuurUploads({
    status: statusFilter || undefined,
    leverancierId: leverancierFilter || undefined,
  });
  const { data: leveranciers } = useLeveranciers();

  // Realtime: useFactuurUploads subscribet zelf op Broadcast-channel
  // `inkoop:{locationId}` event `factuur.status` en invalideert de query.
  // Geen lokale subscription meer nodig.

  const leverancierOptions = [
    { value: "", label: "Alle leveranciers" },
    ...(leveranciers ?? []).map((l: any) => ({ value: l.id, label: l.naam })),
  ];

  return (
    <div className="space-y-6">
      {/* Tip card */}
      <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/20 p-4">
        <Lightbulb className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Tip: automatisch facturen ontvangen</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stuur facturen automatisch door naar facturen@nesto.app en ze
            verschijnen hier automatisch.
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <FactuurUploadZone />

      {/* Filters */}
      <div className="flex gap-3">
        <div className="w-48">
          <NestoSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="Status"
          />
        </div>
        <div className="w-48">
          <NestoSelect
            value={leverancierFilter}
            onValueChange={setLeverancierFilter}
            options={leverancierOptions}
            placeholder="Leverancier"
          />
        </div>
      </div>

      {/* Overzicht */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !facturen || facturen.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Geen facturen"
          description="Upload je eerste factuur om te beginnen."
        />
      ) : (
        <div className="space-y-2">
          {facturen.map((f) => {
            const badge = STATUS_BADGES[f.status] ?? STATUS_BADGES.review;
            const aiBadge = f.ai_parsing_status
              ? AI_BADGES[f.ai_parsing_status]
              : null;
            return (
              <div
                key={f.id}
                onClick={() => navigate(`/inkoop/facturen/${f.id}`)}
                className="flex items-center gap-4 py-3 px-4 rounded-xl border border-border/30 bg-card hover:bg-muted/30 cursor-pointer transition-colors min-h-[44px]"
              >
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {f.bestandsnaam}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString("nl-NL")} ·{" "}
                    {f.leverancier_naam}
                  </p>
                </div>
                {aiBadge && (
                  <NestoBadge variant={aiBadge.variant} size="sm" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    {aiBadge.label}
                  </NestoBadge>
                )}
                <NestoBadge variant={badge.variant} size="sm">
                  {badge.label}
                </NestoBadge>
                {f.totaalbedrag != null && (
                  <span className="text-sm font-medium shrink-0">
                    €{f.totaalbedrag.toFixed(2)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
