import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Check } from "lucide-react";
import { useChecklistRuns } from "@/hooks/useChecklistRuns";
import { useUserContext } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  NestoButton,
  NestoCard,
  NestoCardContent,
  NestoBadge,
  NestoInput,
  Spinner,
  EmptyState,
} from "@/components/polar";
import { Checkbox } from "@/components/ui/checkbox";
import { nestoToast } from "@/lib/nestoToast";
import { CheckSquare } from "lucide-react";
import type { ChecklistItem } from "@/hooks/useChecklistTemplates";

/**
 * Heuristiek: bepaal het type voor temperatuur_registraties
 * op basis van de titel van het checklist-item.
 */
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

  const run = useMemo(
    () => (runs ?? []).find((r) => r.id === runId),
    [runs, runId]
  );

  const items = useMemo<ChecklistItem[]>(
    () =>
      (run?.template?.items ?? [])
        .slice()
        .sort((a, b) => a.volgorde - b.volgorde),
    [run]
  );

  const responsesById = useMemo(() => {
    const m = new Map<string, any>();
    (run?.responses ?? []).forEach((r) => m.set(r.item_id, r));
    return m;
  }, [run]);

  const [tempInputs, setTempInputs] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!run) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="Checklist niet gevonden"
        description="Deze checklist bestaat niet of is van een andere dag."
        action={{
          label: "Terug naar vandaag",
          onClick: () => navigate("/taken"),
        }}
      />
    );
  }

  const total = items.length;
  const done = (run.responses ?? []).filter(
    (r) => r.checked || r.temperatuur !== null || r.notitie
  ).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isAfgerond = run.status === "afgerond";

  const handleCheck = (item: ChecklistItem, checked: boolean) => {
    saveResponse.mutate({
      run_id: run.id,
      item_id: item.id,
      type: "check",
      checked,
    });
  };

  /**
   * Sequentiële flow: eerst response opslaan, dan dual-write naar
   * temperatuur_registraties (HACCP-historie). Bij elke fout: zichtbare toast.
   */
  const handleTemp = async (item: ChecklistItem) => {
    const raw = tempInputs[item.id];
    const temp = parseFloat(raw);
    if (isNaN(temp)) {
      nestoToast.error("Geef een geldige temperatuur op");
      return;
    }
    const inRange =
      (item.temp_min == null || temp >= item.temp_min) &&
      (item.temp_max == null || temp <= item.temp_max);

    // Stap 1 — checklist response (await, geen fire-and-forget)
    try {
      await saveResponse.mutateAsync({
        run_id: run.id,
        item_id: item.id,
        type: "temperatuur",
        temperatuur: temp,
        temp_in_range: inRange,
      });
    } catch (e) {
      console.error("saveResponse faalde", e);
      nestoToast.error("Opslaan mislukt — probeer opnieuw");
      return;
    }

    // Input wissen na succesvolle response
    setTempInputs((p) => {
      const { [item.id]: _omit, ...rest } = p;
      return rest;
    });

    // Stap 2 — dual-write HACCP-historie
    try {
      const { error } = await supabase
        .from("temperatuur_registraties")
        .insert({
          location_id: currentLocation!.id,
          locatie_naam: item.titel,
          type: afleidTempType(item.titel),
          temperatuur: temp,
          in_range: inRange,
          min_temp: item.temp_min ?? null,
          max_temp: item.temp_max ?? null,
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

  const handleAfronden = () => {
    afronden.mutate(run.id, {
      onSuccess: () => {
        nestoToast.success("Checklist afgerond");
        navigate("/taken");
      },
    });
  };

  const statusLabel =
    run.status === "afgerond"
      ? "Afgerond"
      : run.status === "bezig"
        ? "Bezig"
        : "Open";
  const statusVariant: "success" | "warning" | "default" =
    run.status === "afgerond"
      ? "success"
      : run.status === "bezig"
        ? "warning"
        : "default";

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <Link
        to="/taken"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Terug naar vandaag
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">{run.template?.naam}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(run.datum).toLocaleDateString("nl-NL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <NestoBadge variant={statusVariant}>{statusLabel}</NestoBadge>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const resp = responsesById.get(item.id);
          const isTemp = item.type === "temperatuur";

          return (
            <NestoCard key={item.id}>
              <NestoCardContent className="py-5">
                {!isTemp ? (
                  <label className="flex items-start gap-4 cursor-pointer">
                    <Checkbox
                      checked={!!resp?.checked}
                      onCheckedChange={(c) => handleCheck(item, !!c)}
                      disabled={isAfgerond}
                      className="mt-1 h-5 w-5"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.titel}</p>
                      {item.vereist && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Vereist
                        </p>
                      )}
                    </div>
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">{item.titel}</p>
                      {(item.temp_min != null || item.temp_max != null) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Bereik: {item.temp_min ?? "—"}°C tot{" "}
                          {item.temp_max ?? "—"}°C
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <NestoInput
                        type="number"
                        step="0.1"
                        placeholder={
                          resp?.temperatuur != null
                            ? `${resp.temperatuur}°C`
                            : "Temp °C"
                        }
                        value={tempInputs[item.id] ?? ""}
                        onChange={(e) =>
                          setTempInputs((p) => ({
                            ...p,
                            [item.id]: e.target.value,
                          }))
                        }
                        disabled={isAfgerond}
                        className="max-w-[140px]"
                      />
                      <NestoButton
                        size="sm"
                        onClick={() => handleTemp(item)}
                        disabled={isAfgerond || !tempInputs[item.id]}
                      >
                        Opslaan
                      </NestoButton>
                      {resp?.temperatuur != null && (
                        <NestoBadge
                          variant={resp.temp_in_range ? "success" : "error"}
                        >
                          {resp.temperatuur}°C{" "}
                          {resp.temp_in_range ? "✓" : "buiten bereik"}
                        </NestoBadge>
                      )}
                    </div>
                  </div>
                )}
              </NestoCardContent>
            </NestoCard>
          );
        })}
      </div>

      {!isAfgerond && (
        <div className="sticky bottom-0 border-t border-border/50 bg-background p-4 mt-6 flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[300px]">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              {done}/{total}
            </span>
          </div>
          <NestoButton
            onClick={handleAfronden}
            isLoading={afronden.isPending}
            className="min-h-[44px] px-6"
          >
            <Check className="h-4 w-4 mr-2" />
            Afronden
          </NestoButton>
        </div>
      )}
    </div>
  );
}
