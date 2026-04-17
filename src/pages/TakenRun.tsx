import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Check, Lock, CheckSquare } from "lucide-react";
import { useChecklistRuns, isRunFrozen } from "@/hooks/useChecklistRuns";
import { useKeukenSettings } from "@/hooks/useKeukenSettings";
import { useUserContext } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  NestoButton, NestoBadge, NestoInput, Spinner, EmptyState, ConfirmDialog,
} from "@/components/polar";
import { Checkbox } from "@/components/ui/checkbox";
import { nestoToast } from "@/lib/nestoToast";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "@/hooks/useChecklistTemplates";

function afleidTempType(titel: string): string {
  const t = titel.toLowerCase();
  if (t.includes("vriezer") || t.includes("freezer")) return "vriezer";
  if (t.includes("warm")) return "warmhouden";
  if (t.includes("kern")) return "kern";
  return "koeling";
}

export default function TakenRun() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { currentLocation } = useUserContext();
  const { user } = useAuth();
  const { data: runs, isLoading, saveResponse, afronden } = useChecklistRuns();
  const { data: keukenSettings } = useKeukenSettings();
  const [tempInputs, setTempInputs] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const run = useMemo(() => (runs ?? []).find((r) => r.id === runId), [runs, runId]);

  const items = useMemo<ChecklistItem[]>(
    () => (run?.template?.items ?? []).slice().sort((a, b) => a.volgorde - b.volgorde),
    [run]
  );

  const responsesById = useMemo(() => {
    const m = new Map<string, any>();
    (run?.responses ?? []).forEach((r) => m.set(r.item_id, r));
    return m;
  }, [run]);

  const otherRuns = useMemo(
    () => (runs ?? []).filter((r) => r.id !== runId),
    [runs, runId]
  );

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  if (!run) {
    return (
      <EmptyState icon={CheckSquare} title="Checklist niet gevonden"
        description="Deze checklist bestaat niet of is van een andere dag."
        action={{ label: "Terug naar vandaag", onClick: () => navigate("/taken") }} />
    );
  }

  const frozen = isRunFrozen(run, keukenSettings?.haccp_freeze_tijd);
  const isAfgerond = run.status === "afgerond";

  const isItemDone = (item: ChecklistItem) => {
    const r = responsesById.get(item.id);
    if (!r) return false;
    return r.checked === true || r.temperatuur != null || (r.notitie && r.notitie.length > 0);
  };
  const vereistOpen = items.filter((it) => it.vereist && !isItemDone(it));
  const total = items.length;
  const done = items.filter(isItemDone).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleCheck = (item: ChecklistItem, checked: boolean) => {
    if (frozen) return;
    saveResponse.mutate({
      run_id: run.id, item_id: item.id, type: "check", checked,
    });
  };

  const handleTemp = async (item: ChecklistItem) => {
    if (frozen) return;
    const raw = tempInputs[item.id];
    const temp = parseFloat(raw);
    if (isNaN(temp)) {
      nestoToast.error("Geef een geldige temperatuur op");
      return;
    }
    const inRange =
      (item.temp_min == null || temp >= item.temp_min) &&
      (item.temp_max == null || temp <= item.temp_max);

    try {
      await saveResponse.mutateAsync({
        run_id: run.id, item_id: item.id, type: "temperatuur",
        temperatuur: temp, temp_in_range: inRange,
      });
    } catch {
      return;
    }

    setTempInputs((p) => {
      const { [item.id]: _omit, ...rest } = p;
      return rest;
    });

    try {
      const { error } = await supabase.from("temperatuur_registraties").insert({
        location_id: currentLocation!.id, locatie_naam: item.titel,
        type: afleidTempType(item.titel), temperatuur: temp, in_range: inRange,
        min_temp: item.temp_min ?? null, max_temp: item.temp_max ?? null,
        gemeten_door: user?.id ?? null,
      });
      if (error) throw error;
    } catch (e) {
      console.error("Dual-write temperatuur_registraties faalde", e);
      nestoToast.warning(
        "Geregistreerd, maar HACCP-historie kon niet bijgewerkt worden",
        "Neem contact op met support"
      );
    }
  };

  const triggerAfronden = () => {
    if (vereistOpen.length > 0) { setConfirmOpen(true); return; }
    doAfronden();
  };

  const doAfronden = () => {
    setConfirmOpen(false);
    afronden.mutate(run.id, {
      onSuccess: () => {
        nestoToast.success("Checklist afgerond");
        navigate("/taken");
      },
    });
  };

  const statusLabel = isAfgerond ? "Afgerond"
    : run.status === "bezig" ? "Bezig" : "Open";
  const statusVariant: "success" | "warning" | "default" =
    isAfgerond ? "success" : run.status === "bezig" ? "warning" : "default";

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <Link to="/taken"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ChevronLeft className="h-4 w-4" />
        Terug naar vandaag
      </Link>

      {otherRuns.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-5 text-xs">
          <span className="text-muted-foreground">Vandaag ook:</span>
          {otherRuns.map((r) => {
            const tot = r.template?.items?.length ?? 0;
            const dn = (r.responses ?? []).filter(
              (x) => x.checked || x.temperatuur != null || x.notitie
            ).length;
            const isDone = r.status === "afgerond";
            return (
              <button key={r.id} onClick={() => navigate(`/taken/run/${r.id}`)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors hover:bg-accent",
                  isDone ? "border-success/30 text-success" : "border-border text-foreground"
                )}>
                <span className="font-medium">{r.template?.naam}</span>
                <span className="text-muted-foreground tabular-nums">{dn}/{tot}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold">{run.template?.naam}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(run.datum).toLocaleDateString("nl-NL",
              { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {frozen ? (
            <NestoBadge variant="default" className="gap-1">
              <Lock className="h-3 w-3" /> Bevroren voor HACCP
            </NestoBadge>
          ) : (
            <NestoBadge variant={statusVariant}>{statusLabel}</NestoBadge>
          )}
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border bg-card">
        {items.map((item) => {
          const resp = responsesById.get(item.id);
          const isTemp = item.type === "temperatuur";

          if (!isTemp) {
            return (
              <label key={item.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 min-h-[48px] cursor-pointer hover:bg-accent/40 transition-colors",
                  frozen && "cursor-not-allowed opacity-70"
                )}>
                <Checkbox
                  checked={!!resp?.checked}
                  onCheckedChange={(c) => handleCheck(item, !!c)}
                  disabled={frozen}
                  className="h-5 w-5 flex-shrink-0"
                />
                <span className="text-sm font-medium flex-1 truncate">{item.titel}</span>
                {item.vereist && (
                  <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider flex-shrink-0">
                    Vereist
                  </span>
                )}
              </label>
            );
          }

          return (
            <div key={item.id} className="px-4 py-3 hover:bg-accent/20 transition-colors">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.titel}</span>
                    {item.vereist && (
                      <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                        Vereist
                      </span>
                    )}
                  </div>
                  {(item.temp_min != null || item.temp_max != null) && (
                    <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      {item.temp_min ?? "—"}°C tot {item.temp_max ?? "—"}°C
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <NestoInput type="number" step="0.1"
                    placeholder={resp?.temperatuur != null ? `${resp.temperatuur}°C` : "Temp °C"}
                    value={tempInputs[item.id] ?? ""}
                    onChange={(e) => setTempInputs((p) => ({ ...p, [item.id]: e.target.value }))}
                    disabled={frozen}
                    className="max-w-[110px] h-9" />
                  <NestoButton size="sm" onClick={() => handleTemp(item)}
                    disabled={frozen || !tempInputs[item.id]}>
                    Opslaan
                  </NestoButton>
                  {resp?.temperatuur != null && (
                    <NestoBadge variant={resp.temp_in_range ? "success" : "error"}>
                      {resp.temperatuur}°C {resp.temp_in_range ? "✓" : "!"}
                    </NestoBadge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!frozen && (
        <div className="sticky bottom-0 border-t border-border/50 bg-background p-4 mt-6 flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[300px]">
              <div className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">{done}/{total}</span>
            {vereistOpen.length > 0 && (
              <span className="text-xs text-warning">
                {vereistOpen.length} vereist open
              </span>
            )}
          </div>
          <NestoButton onClick={triggerAfronden} isLoading={afronden.isPending}
            className="min-h-[44px] px-6">
            <Check className="h-4 w-4 mr-2" />
            {isAfgerond ? "Opnieuw afronden" : "Afronden"}
          </NestoButton>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Vereiste items nog open"
        description={`Je hebt nog ${vereistOpen.length} vereist${vereistOpen.length === 1 ? "" : "e"} item${vereistOpen.length === 1 ? "" : "s"} open. Toch afronden?`}
        confirmLabel="Toch afronden"
        cancelLabel="Annuleren"
        onConfirm={doAfronden}
      />
    </div>
  );
}
