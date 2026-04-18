import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Check, Lock, CheckSquare, Camera, AlertCircle } from "lucide-react";
import { useChecklistRuns, isRunFrozen, getRunItems, getOverdueMap, type RunItem } from "@/hooks/useChecklistRuns";
import { formatFrequentieKort, formatDatumKort } from "@/lib/frequentieFormat";
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
import { FotoReferentieDialog } from "@/components/taken/FotoReferentieDialog";
import { SectieGroup } from "@/components/taken/SectieGroup";
import { groupItemsBySectie } from "@/lib/sectieGroup";

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
  const [fotoDialogItem, setFotoDialogItem] = useState<ChecklistItem | null>(null);

  const run = useMemo(() => (runs ?? []).find((r) => r.id === runId), [runs, runId]);

  const items = useMemo<RunItem[]>(
    () => (run ? getRunItems(run) : []),
    [run]
  );

  // Splits live vs verwijderd. Verwijderde items komen onderaan in een
  // aparte audit-sectie; ze blijven leesbaar maar zijn niet meer bewerkbaar.
  const { liveItems, removedItems } = useMemo(() => {
    const live: RunItem[] = [];
    const removed: RunItem[] = [];
    for (const it of items) {
      if (it._removed) removed.push(it);
      else live.push(it);
    }
    return { liveItems: live, removedItems: removed };
  }, [items]);

  const overdueMap = useMemo(
    () => (run ? getOverdueMap(run) : new Map<string, string>()),
    [run]
  );

  const isPerItem = run?.template?.modus === "per_item";

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
  // Voortgang & vereiste items: alleen op live-items (verwijderde items zijn
  // alleen-lezen audit-bewijs en mogen voortgang niet beïnvloeden).
  const vereistOpen = liveItems.filter((it) => it.vereist && !isItemDone(it));
  const total = liveItems.length;
  const done = liveItems.filter(isItemDone).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = pct === 100;

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
    <div className="space-y-6 pb-24">
      {/* Compact back-link (geen PageHeader op subpagina) */}
      <div className="max-w-4xl mx-auto">
        <Link to="/taken"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Terug naar vandaag
        </Link>
      </div>

      {/* Voortgangs-blok — visual anchor */}
      <div className="max-w-4xl mx-auto rounded-lg border border-border/60 bg-card p-5 space-y-4 shadow-[0_1px_2px_rgb(0_0_0/0.02)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{run.template?.naam}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date(run.datum).toLocaleDateString("nl-NL",
                { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {frozen ? (
              <NestoBadge variant="default" className="gap-1">
                <Lock className="h-3 w-3" /> Bevroren voor HACCP
              </NestoBadge>
            ) : (
              <NestoBadge variant={statusVariant}>{statusLabel}</NestoBadge>
            )}
          </div>
        </div>

        {/* Pill-progressbar + counter */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-[width,background-color] duration-300 ease-out",
                isComplete ? "bg-success" : "bg-primary"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm tabular-nums text-muted-foreground flex-shrink-0">
            {done} van {total} · {pct}%
          </span>
        </div>

        {/* "Vandaag ook" chips */}
        {otherRuns.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
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
      </div>

      {/* Items lijst — gegroepeerd per sectie */}
      <div className="max-w-4xl mx-auto rounded-lg border border-border/60 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.02)] overflow-hidden">
        {(() => {
          const groepen = groupItemsBySectie(liveItems);
          // Sectie-headers tonen we alleen als er meerdere secties zijn, óf als
          // de enige sectie een expliciete naam heeft (niet "Algemeen" default).
          const showHeaders = groepen.length > 1 || (groepen[0] && groepen[0].naam !== "Algemeen");

          const renderItem = (item: RunItem) => {
            const resp = responsesById.get(item.id);
            const isTemp = item.type === "temperatuur";
            const fotoUrls = item.foto_urls ?? [];
            const hasFotos = fotoUrls.length > 0;
            const itemDone = isItemDone(item);
            const overdueVan = overdueMap.get(item.id);
            const isRemoved = item._removed === true;
            const isLocked = frozen || isRemoved;
            const itemFreqLabel = isPerItem
              ? formatFrequentieKort(item.item_frequentie, item.item_frequentie_config)
              : null;

            if (!isTemp) {
              return (
                <label
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3.5 px-5 py-3 min-h-[56px] transition-colors duration-150",
                    isLocked ? "cursor-not-allowed" : "cursor-pointer",
                    itemDone ? "bg-success/[0.04] hover:bg-success/[0.06]" : "hover:bg-accent/40",
                    "focus-within:bg-accent/30",
                    frozen && "opacity-70",
                    isRemoved && "bg-muted/30 opacity-90"
                  )}
                >
                  <Checkbox
                    checked={!!resp?.checked}
                    onCheckedChange={(c) => handleCheck(item, !!c)}
                    disabled={isLocked}
                    className="h-5 w-5 flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          "text-sm font-medium transition-colors",
                          itemDone && "text-foreground/50 line-through",
                          isRemoved && "italic text-muted-foreground"
                        )}
                      >
                        {item.titel}
                      </span>
                      {isRemoved && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-[10px] font-medium text-amber-700 uppercase tracking-wider">
                          Verwijderd uit template
                        </span>
                      )}
                      {itemFreqLabel && !isRemoved && (
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          · {itemFreqLabel}
                        </span>
                      )}
                      {overdueVan && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-error tabular-nums">
                          <AlertCircle className="h-3 w-3" />
                          moest {formatDatumKort(overdueVan)}
                        </span>
                      )}
                    </div>
                    {item.beschrijving?.trim() && (
                      <p
                        className={cn(
                          "text-xs mt-1 leading-relaxed whitespace-pre-line",
                          itemDone ? "text-foreground/40" : "text-foreground/70"
                        )}
                      >
                        {item.beschrijving}
                      </p>
                    )}
                  </div>
                  {hasFotos && !isRemoved && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFotoDialogItem(item);
                      }}
                      className="text-muted-foreground hover:text-primary p-1 rounded transition-colors flex-shrink-0 mt-0.5"
                      aria-label={`${fotoUrls.length} referentiefoto${fotoUrls.length === 1 ? "" : "'s"} bekijken`}
                      title={`${fotoUrls.length} referentiefoto${fotoUrls.length === 1 ? "" : "'s"}`}
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  )}
                  {item.vereist && !isRemoved && (
                    <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider flex-shrink-0 mt-1.5">
                      Vereist
                    </span>
                  )}
                </label>
              );
            }

            return (
              <div
                key={item.id}
                className={cn(
                  "px-5 py-3.5 transition-colors duration-150",
                  itemDone ? "bg-success/[0.04]" : "hover:bg-accent/20",
                  isRemoved && "bg-muted/30 opacity-90"
                )}
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          itemDone && "text-foreground/50",
                          isRemoved && "italic text-muted-foreground"
                        )}
                      >
                        {item.titel}
                      </span>
                      {isRemoved && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-[10px] font-medium text-amber-700 uppercase tracking-wider">
                          Verwijderd uit template
                        </span>
                      )}
                      {itemFreqLabel && !isRemoved && (
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          · {itemFreqLabel}
                        </span>
                      )}
                      {overdueVan && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-error tabular-nums">
                          <AlertCircle className="h-3 w-3" />
                          moest {formatDatumKort(overdueVan)}
                        </span>
                      )}
                      {hasFotos && !isRemoved && (
                        <button
                          type="button"
                          onClick={() => setFotoDialogItem(item)}
                          className="text-muted-foreground hover:text-primary p-1 -m-1 rounded transition-colors"
                          aria-label={`${fotoUrls.length} referentiefoto${fotoUrls.length === 1 ? "" : "'s"} bekijken`}
                          title={`${fotoUrls.length} referentiefoto${fotoUrls.length === 1 ? "" : "'s"}`}
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      )}
                      {item.vereist && !isRemoved && (
                        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                          Vereist
                        </span>
                      )}
                    </div>
                    {item.beschrijving?.trim() && (
                      <p className="text-xs text-foreground/70 mt-1 leading-relaxed whitespace-pre-line">
                        {item.beschrijving}
                      </p>
                    )}
                    {(item.temp_min != null || item.temp_max != null) && !isRemoved && (
                      <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                        {item.temp_min ?? "—"}°C tot {item.temp_max ?? "—"}°C
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isRemoved && (
                      <>
                        <NestoInput
                          type="number"
                          step="0.1"
                          placeholder={resp?.temperatuur != null ? `${resp.temperatuur}°C` : "Temp °C"}
                          value={tempInputs[item.id] ?? ""}
                          onChange={(e) => setTempInputs((p) => ({ ...p, [item.id]: e.target.value }))}
                          disabled={isLocked}
                          className="max-w-[110px] h-9"
                        />
                        <NestoButton size="sm" onClick={() => handleTemp(item)} disabled={isLocked || !tempInputs[item.id]}>
                          Opslaan
                        </NestoButton>
                      </>
                    )}
                    {resp?.temperatuur != null && (
                      <NestoBadge variant={resp.temp_in_range ? "success" : "error"}>
                        {resp.temperatuur}°C {resp.temp_in_range ? "✓" : "!"}
                      </NestoBadge>
                    )}
                  </div>
                </div>
              </div>
            );
          };

          if (!showHeaders) {
            // Geen secties → render als platte lijst (oude gedrag)
            return (
              <>
                <div className="divide-y divide-border/40">{groepen[0]?.items.map(renderItem)}</div>
                {removedItems.length > 0 && (
                  <div className="border-t border-amber-200/70 bg-amber-50/30">
                    <div className="px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-amber-700/80">
                      Audit — verwijderd door chef (alleen-lezen)
                    </div>
                    <div className="divide-y divide-border/40">
                      {removedItems.map(renderItem)}
                    </div>
                  </div>
                )}
              </>
            );
          }

          return (
            <>
              {groepen.map((groep, idx) => {
                const groepDone = groep.items.filter(isItemDone).length;
                return (
                  <SectieGroup
                    key={groep.naam}
                    naam={groep.naam}
                    done={groepDone}
                    total={groep.items.length}
                    isFirst={idx === 0}
                  >
                    {groep.items.map(renderItem)}
                  </SectieGroup>
                );
              })}
              {removedItems.length > 0 && (
                <div className="border-t border-amber-200/70 bg-amber-50/30">
                  <div className="px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-amber-700/80">
                    Audit — verwijderd door chef (alleen-lezen)
                  </div>
                  <div className="divide-y divide-border/40">
                    {removedItems.map(renderItem)}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Sticky footer — altijd zichtbaar, commit-moment. Progressbar staat in voortgangs-blok bovenaan; hier alleen counter + actie. */}
      {!frozen && (
        <div className="sticky bottom-0 -mx-8 lg:-mx-12 xl:-mx-16 border-t border-border/60 bg-card/95 backdrop-blur-md px-8 lg:px-12 xl:px-16 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {isComplete ? (
                <span className="text-success font-medium">Alles klaar — afronden?</span>
              ) : vereistOpen.length > 0 ? (
                <span><span className="text-warning font-medium">{vereistOpen.length} vereist{vereistOpen.length === 1 ? "" : "e"} item{vereistOpen.length === 1 ? "" : "s"}</span> nog open</span>
              ) : (
                <span className="tabular-nums">{done} van {total} afgevinkt</span>
              )}
            </div>
            <NestoButton onClick={triggerAfronden} isLoading={afronden.isPending}
              className="min-h-[44px] px-6 font-semibold">
              <Check className="h-4 w-4 mr-2" />
              {isAfgerond ? "Opnieuw afronden" : "Afronden"}
            </NestoButton>
          </div>
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

      <FotoReferentieDialog
        open={fotoDialogItem !== null}
        onOpenChange={(o) => { if (!o) setFotoDialogItem(null); }}
        titel={fotoDialogItem?.titel ?? ""}
        fotoUrls={fotoDialogItem?.foto_urls ?? []}
      />
    </div>
  );
}
