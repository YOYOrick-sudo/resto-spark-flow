import { useNavigate } from "react-router-dom";
import { useChecklistTemplates } from "@/hooks/useChecklistTemplates";
import {
  useChecklistRuns,
  getRunItems,
  getOverdueMap,
  type ChecklistRun,
} from "@/hooks/useChecklistRuns";
import { useKeukenSettings } from "@/hooks/useKeukenSettings";
import {
  NestoButton,
  NestoCard,
  NestoCardContent,
  NestoBadge,
  EmptyState,
  Spinner,
} from "@/components/polar";
import { CheckSquare, Play, AlertTriangle, Repeat } from "lucide-react";
import {
  formatFrequentieLang,
  getEffectieveTijd,
  getDagdeel,
  formatDatumNL,
  formatDatumKort,
  DAGDEEL_LABEL,
  DAGDEEL_TIJD,
  type Dagdeel,
} from "@/lib/frequentieFormat";
import { cn } from "@/lib/utils";
import type { Frequentie } from "@/hooks/useChecklistTemplates";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning"> = {
  open: "default",
  bezig: "warning",
  afgerond: "success",
};

const DAGDEEL_ORDER: Dagdeel[] = ["ochtend", "middag", "avond"];

interface OverdueEntry {
  run: ChecklistRun;
  itemId: string;
  itemTitel: string;
  overdueVan: string;
}

export function DagelijksTab() {
  const navigate = useNavigate();
  const { data: templates, isLoading: tLoading, seedTemplates } = useChecklistTemplates();
  const { data: runs, isLoading: rLoading, startDag } = useChecklistRuns();
  const { data: settings } = useKeukenSettings();

  const isLoading = tLoading || rLoading;
  const activeTemplates = (templates ?? []).filter((t) => t.actief);
  const hasRuns = (runs ?? []).length > 0;
  const hasTemplates = activeTemplates.length > 0;
  const today = new Date().toISOString().split("T")[0];

  if (!isLoading && !hasTemplates && templates !== undefined) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="Geen checklist templates"
        description="Maak standaard templates aan om te beginnen."
        action={{
          label: "Standaard templates aanmaken",
          onClick: () => seedTemplates.mutate(),
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const standaardTijden = settings?.standaard_tijden_per_type;

  // Verzamel alle overdue items uit alle runs vandaag
  const overdueEntries: OverdueEntry[] = [];
  for (const run of runs ?? []) {
    const overdueMap = getOverdueMap(run);
    if (overdueMap.size === 0) continue;
    const allItems = run.template?.items ?? [];
    for (const [itemId, overdueVan] of overdueMap.entries()) {
      const item = allItems.find((it) => it.id === itemId);
      if (!item) continue;
      overdueEntries.push({
        run,
        itemId,
        itemTitel: item.titel,
        overdueVan,
      });
    }
  }
  // Sorteer overdue: oudste eerst
  overdueEntries.sort((a, b) => a.overdueVan.localeCompare(b.overdueVan));

  // Verrijk runs met effectieve tijd + dagdeel
  type RunMeta = {
    run: ChecklistRun;
    tijd: string;
    dagdeel: Dagdeel;
    done: number;
    total: number;
    pct: number;
    freqLabel: string | null;
    isPerItem: boolean;
  };
  const runMetas: RunMeta[] = (runs ?? []).map((run) => {
    const tijd = getEffectieveTijd(
      run.template?.default_time,
      run.template?.type,
      standaardTijden
    );
    const items = getRunItems(run);
    const total = items.length;
    const done = run.responses.filter(
      (r) => r.checked || r.temperatuur !== null || r.notitie
    ).length;
    const isPerItem = run.template?.modus === "per_item";
    // Frequentie-badge alleen bij gebundeld + niet-dagelijks
    const freqLabel =
      !isPerItem && run.template
        ? formatFrequentieLang(
            run.template.frequentie as Frequentie,
            run.template.frequentie_config
          )
        : null;
    return {
      run,
      tijd,
      dagdeel: getDagdeel(tijd),
      done,
      total,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      freqLabel,
      isPerItem,
    };
  });

  // Sorteer alle runs op tijd
  runMetas.sort((a, b) => a.tijd.localeCompare(b.tijd));

  // Groepeer per dagdeel — alleen dagdelen tonen waar runs in zitten
  const groepen = DAGDEEL_ORDER.map((d) => ({
    dagdeel: d,
    runs: runMetas.filter((m) => m.dagdeel === d),
  })).filter((g) => g.runs.length > 0);

  return (
    <div className="space-y-6">
      {/* Datum-header */}
      <div>
        <h2 className="text-sm text-muted-foreground capitalize">
          Vandaag — {formatDatumNL(today)}
        </h2>
      </div>

      {/* Overdue-banner */}
      {overdueEntries.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-destructive/20 bg-destructive/[0.06]">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">
              {overdueEntries.length}{" "}
              {overdueEntries.length === 1 ? "taak gemist" : "taken gemist"}
            </span>
          </div>
          <ul className="divide-y divide-destructive/15">
            {overdueEntries.map((o) => (
              <li key={`${o.run.id}-${o.itemId}`}>
                <button
                  type="button"
                  onClick={() => navigate(`/taken/run/${o.run.id}`)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-destructive/[0.06] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {o.itemTitel}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {o.run.template?.naam}
                    </p>
                  </div>
                  <NestoBadge variant="error" className="flex-shrink-0">
                    moest {formatDatumKort(o.overdueVan)}
                  </NestoBadge>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Geen runs vandaag → start-card */}
      {!hasRuns && hasTemplates && (
        <NestoCard>
          <NestoCardContent className="flex items-center justify-between py-6">
            <div>
              <p className="font-medium">Nieuwe dag</p>
              <p className="text-sm text-muted-foreground">
                Start de dag en maak checklists aan voor alle actieve templates.
              </p>
            </div>
            <NestoButton
              onClick={() => startDag.mutate(activeTemplates.map((t) => t.id))}
              isLoading={startDag.isPending}
              className="min-h-[48px] px-6"
            >
              <Play className="h-4 w-4 mr-2" />
              Dag starten
            </NestoButton>
          </NestoCardContent>
        </NestoCard>
      )}

      {/* Tijdlijn per dagdeel */}
      {groepen.map(({ dagdeel, runs: dagRuns }) => (
        <section key={dagdeel} className="space-y-2.5">
          <header className="flex items-baseline gap-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {DAGDEEL_LABEL[dagdeel]}
            </h3>
            <span className="text-xs text-muted-foreground/70 tabular-nums">
              {DAGDEEL_TIJD[dagdeel]}
            </span>
          </header>

          <div className="grid gap-2">
            {dagRuns.map(({ run, tijd, done, total, pct, freqLabel }) => (
              <NestoCard
                key={run.id}
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate(`/taken/run/${run.id}`)}
              >
                <NestoCardContent className="flex items-center gap-4 py-3.5">
                  {/* Tijd-kolom */}
                  <div className="text-sm font-semibold tabular-nums text-muted-foreground w-14 flex-shrink-0">
                    {tijd}
                  </div>

                  {/* Naam + voortgang */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">
                        {run.template?.naam ?? "Checklist"}
                      </p>
                      {freqLabel && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                          <Repeat className="h-2.5 w-2.5" />
                          {freqLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[200px]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            run.status === "afgerond" ? "bg-success" : "bg-primary"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {done}/{total}
                      </span>
                    </div>
                  </div>

                  <NestoBadge variant={STATUS_VARIANT[run.status] ?? "default"}>
                    {run.status === "open"
                      ? "Open"
                      : run.status === "bezig"
                      ? "Bezig"
                      : "Afgerond"}
                  </NestoBadge>
                </NestoCardContent>
              </NestoCard>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
