import { useState } from "react";
import { useChecklistTemplates } from "@/hooks/useChecklistTemplates";
import { useChecklistRuns } from "@/hooks/useChecklistRuns";
import { NestoButton, NestoCard, NestoCardContent, NestoBadge, EmptyState, Spinner } from "@/components/polar";
import { CheckSquare, Play } from "lucide-react";
import { ChecklistRunPanel } from "./ChecklistRunPanel";
import type { ChecklistRun } from "@/hooks/useChecklistRuns";

const TYPE_ORDER = ["opening", "tussentijds", "sluiting", "schoonmaak", "haccp"];
const TYPE_LABELS: Record<string, string> = {
  opening: "Opening",
  tussentijds: "Tussentijds",
  sluiting: "Sluiting",
  schoonmaak: "Schoonmaak",
  haccp: "HACCP",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "warning"> = {
  open: "default",
  bezig: "warning",
  afgerond: "success",
};

export function DagelijksTab() {
  const { data: templates, isLoading: tLoading, seedTemplates } = useChecklistTemplates();
  const { data: runs, isLoading: rLoading, startDag } = useChecklistRuns();
  const [selectedRun, setSelectedRun] = useState<ChecklistRun | null>(null);

  const isLoading = tLoading || rLoading;
  const activeTemplates = (templates ?? []).filter((t) => t.actief);
  const hasRuns = (runs ?? []).length > 0;
  const hasTemplates = activeTemplates.length > 0;

  if (!isLoading && !hasTemplates && templates !== undefined) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="Geen checklist templates"
        description="Maak standaard templates aan om te beginnen."
      >
        <NestoButton onClick={() => seedTemplates.mutate()} loading={seedTemplates.isPending}>
          Standaard templates aanmaken
        </NestoButton>
      </EmptyState>
    );
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const grouped = TYPE_ORDER.map((type) => {
    const typeRuns = (runs ?? []).filter((r) => r.template?.type === type);
    return { type, label: TYPE_LABELS[type], runs: typeRuns };
  }).filter((g) => g.runs.length > 0);

  return (
    <div className="space-y-6">
      {!hasRuns && hasTemplates && (
        <NestoCard>
          <NestoCardContent className="flex items-center justify-between py-6">
            <div>
              <p className="font-medium">Nieuwe dag</p>
              <p className="text-sm text-muted-foreground">Start de dag en maak checklists aan voor alle actieve templates.</p>
            </div>
            <NestoButton
              onClick={() => startDag.mutate(activeTemplates.map((t) => t.id))}
              loading={startDag.isPending}
              className="min-h-[48px] px-6"
            >
              <Play className="h-4 w-4 mr-2" />
              Dag starten
            </NestoButton>
          </NestoCardContent>
        </NestoCard>
      )}

      {grouped.map(({ type, label, runs: typeRuns }) => (
        <div key={type} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{label}</h3>
          <div className="grid gap-3">
            {typeRuns.map((run) => {
              const items = run.template?.items ?? [];
              const total = items.length;
              const done = run.responses.filter((r) => r.checked || r.temperatuur !== null || r.notitie).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <NestoCard
                  key={run.id}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setSelectedRun(run)}
                >
                  <NestoCardContent className="flex items-center justify-between py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{run.template?.naam ?? "Checklist"}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[200px]">
                          <div
                            className={`h-full rounded-full transition-all ${run.status === 'afgerond' ? 'bg-success' : 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{done}/{total}</span>
                      </div>
                    </div>
                    <NestoBadge variant={STATUS_VARIANT[run.status] ?? "default"}>
                      {run.status === "open" ? "Open" : run.status === "bezig" ? "Bezig" : "Afgerond"}
                    </NestoBadge>
                  </NestoCardContent>
                </NestoCard>
              );
            })}
          </div>
        </div>
      ))}

      <ChecklistRunPanel
        run={selectedRun}
        open={!!selectedRun}
        onClose={() => setSelectedRun(null)}
      />
    </div>
  );
}
