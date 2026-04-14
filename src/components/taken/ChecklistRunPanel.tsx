import { useState, useEffect } from "react";
import { NestoPanel } from "@/components/polar/NestoPanel";
import { NestoButton } from "@/components/polar";
import { Check, Thermometer, AlertTriangle } from "lucide-react";
import { useChecklistRuns } from "@/hooks/useChecklistRuns";
import type { ChecklistRun, ChecklistResponse } from "@/hooks/useChecklistRuns";
import type { ChecklistItem } from "@/hooks/useChecklistTemplates";
import { cn } from "@/lib/utils";

interface Props {
  run: ChecklistRun | null;
  open: boolean;
  onClose: () => void;
}

export function ChecklistRunPanel({ run, open, onClose }: Props) {
  const { saveResponse, afronden } = useChecklistRuns();
  const [localResponses, setLocalResponses] = useState<Record<string, Partial<ChecklistResponse>>>({});

  useEffect(() => {
    if (!run) return;
    const map: Record<string, Partial<ChecklistResponse>> = {};
    run.responses.forEach((r) => { map[r.item_id] = r; });
    setLocalResponses(map);
  }, [run]);

  if (!run) return null;

  const items = (run.template?.items ?? []).sort((a, b) => a.volgorde - b.volgorde);
  const isAfgerond = run.status === "afgerond";

  const requiredItems = items.filter((i) => i.vereist);
  const allRequiredDone = requiredItems.every((item) => {
    const resp = localResponses[item.id];
    if (!resp) return false;
    if (item.type === "check") return resp.checked === true;
    if (item.type === "temperatuur") return resp.temperatuur !== null && resp.temperatuur !== undefined;
    if (item.type === "notitie") return !!resp.notitie;
    return true;
  });

  const handleCheck = async (item: ChecklistItem) => {
    const current = localResponses[item.id]?.checked ?? false;
    const newVal = !current;
    setLocalResponses((prev) => ({ ...prev, [item.id]: { ...prev[item.id], checked: newVal } }));
    await saveResponse.mutateAsync({
      run_id: run.id,
      item_id: item.id,
      type: "check",
      checked: newVal,
    });
  };

  const handleTemp = async (item: ChecklistItem, value: string) => {
    const temp = value === "" ? undefined : parseFloat(value);
    const inRange = temp !== undefined && item.temp_min !== null && item.temp_max !== null
      ? temp >= item.temp_min && temp <= item.temp_max
      : undefined;
    setLocalResponses((prev) => ({
      ...prev,
      [item.id]: { ...prev[item.id], temperatuur: temp ?? null, temp_in_range: inRange ?? null },
    }));
    if (temp !== undefined) {
      await saveResponse.mutateAsync({
        run_id: run.id,
        item_id: item.id,
        type: "temperatuur",
        temperatuur: temp,
        temp_in_range: inRange,
      });
    }
  };

  const handleNotitie = async (item: ChecklistItem, value: string) => {
    setLocalResponses((prev) => ({ ...prev, [item.id]: { ...prev[item.id], notitie: value } }));
    if (value.trim()) {
      await saveResponse.mutateAsync({
        run_id: run.id,
        item_id: item.id,
        type: "notitie",
        notitie: value,
      });
    }
  };

  const handleAfronden = async () => {
    await afronden.mutateAsync(run.id);
    onClose();
  };

  return (
    <NestoPanel
      open={open}
      onClose={onClose}
      title={run.template?.naam ?? "Checklist"}
      footer={
        !isAfgerond ? (
          <NestoButton
            onClick={handleAfronden}
            disabled={!allRequiredDone}
            loading={afronden.isPending}
            className="w-full min-h-[48px]"
          >
            <Check className="h-4 w-4 mr-2" />
            Afronden
          </NestoButton>
        ) : undefined
      }
    >
      {(titleRef) => (
        <div className="px-5 py-6 space-y-1">
          <h2 ref={titleRef} className="text-xl font-semibold">{run.template?.naam}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {isAfgerond ? "Deze checklist is afgerond." : "Vink alle items af om de checklist af te ronden."}
          </p>

          <div className="space-y-3 mt-6">
            {items.map((item) => {
              const resp = localResponses[item.id];

              if (item.type === "check") {
                const checked = resp?.checked ?? false;
                return (
                  <button
                    key={item.id}
                    onClick={() => !isAfgerond && handleCheck(item)}
                    disabled={isAfgerond}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border transition-colors text-left",
                      "min-h-[48px]",
                      checked ? "bg-success-light border-success/30" : "bg-card border-border hover:border-primary/30",
                      isAfgerond && "opacity-75"
                    )}
                  >
                    <div className={cn(
                      "h-7 w-7 rounded-md flex items-center justify-center shrink-0 border-2 transition-colors",
                      checked ? "bg-success border-success text-white" : "border-muted-foreground/30"
                    )}>
                      {checked && <Check className="h-4 w-4" />}
                    </div>
                    <span className={cn("font-medium", checked && "line-through text-muted-foreground")}>{item.titel}</span>
                    {item.vereist && <span className="text-xs text-error ml-auto">*</span>}
                  </button>
                );
              }

              if (item.type === "temperatuur") {
                const temp = resp?.temperatuur;
                const inRange = resp?.temp_in_range;
                return (
                  <div key={item.id} className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{item.titel}</span>
                      {item.vereist && <span className="text-xs text-error">*</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="°C"
                        disabled={isAfgerond}
                        value={temp ?? ""}
                        onChange={(e) => handleTemp(item, e.target.value)}
                        className="h-14 w-28 text-center text-lg font-semibold rounded-xl border bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {item.temp_min !== null && item.temp_max !== null && (
                        <span className="text-sm text-muted-foreground">
                          ({item.temp_min}°C — {item.temp_max}°C)
                        </span>
                      )}
                      {temp !== null && temp !== undefined && inRange !== null && inRange !== undefined && (
                        <div className={cn(
                          "flex items-center gap-1 text-sm font-medium",
                          inRange ? "text-success" : "text-error"
                        )}>
                          {inRange ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          {inRange ? "OK" : "Buiten range"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              if (item.type === "notitie") {
                return (
                  <div key={item.id} className="p-4 rounded-xl border bg-card space-y-2">
                    <span className="font-medium">{item.titel}</span>
                    {item.vereist && <span className="text-xs text-error ml-1">*</span>}
                    <textarea
                      disabled={isAfgerond}
                      value={resp?.notitie ?? ""}
                      onChange={(e) => handleNotitie(item, e.target.value)}
                      className="w-full min-h-[80px] rounded-xl border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Notitie..."
                    />
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}
    </NestoPanel>
  );
}
