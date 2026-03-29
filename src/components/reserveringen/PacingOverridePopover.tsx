import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpsertPacingOverride, useResetPacingOverride, type PacingOverride } from "@/hooks/usePacingOverrides";

interface PacingOverridePopoverProps {
  locationId: string;
  shiftId: string;
  shiftName: string;
  date: string;
  override: PacingOverride | undefined;
}

export function PacingOverridePopover({
  locationId,
  shiftId,
  shiftName,
  date,
  override,
}: PacingOverridePopoverProps) {
  const [open, setOpen] = useState(false);
  const [covers, setCovers] = useState<string>("");
  const [arrivals, setArrivals] = useState<string>("");
  const [maxTotal, setMaxTotal] = useState<string>("");
  const [onlineEnabled, setOnlineEnabled] = useState(true);

  const upsert = useUpsertPacingOverride();
  const reset = useResetPacingOverride();

  const hasOverride = override && (
    override.override_pacing_limit_covers != null ||
    override.override_pacing_limit_arrivals != null ||
    override.override_max_covers_total != null ||
    override.override_online_booking_enabled != null
  );

  useEffect(() => {
    if (open) {
      setCovers(override?.override_pacing_limit_covers?.toString() ?? "");
      setArrivals(override?.override_pacing_limit_arrivals?.toString() ?? "");
      setMaxTotal(override?.override_max_covers_total?.toString() ?? "");
      setOnlineEnabled(override?.override_online_booking_enabled ?? true);
    }
  }, [open, override]);

  const handleSave = () => {
    upsert.mutate({
      locationId,
      shiftId,
      date,
      overrides: {
        override_pacing_limit_covers: covers ? parseInt(covers) : null,
        override_pacing_limit_arrivals: arrivals ? parseInt(arrivals) : null,
        override_max_covers_total: maxTotal ? parseInt(maxTotal) : null,
        override_online_booking_enabled: onlineEnabled ? null : false,
      },
    }, {
      onSuccess: () => setOpen(false),
    });
  };

  const handleReset = () => {
    reset.mutate({ locationId, shiftId, date }, {
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors",
            hasOverride
              ? "text-primary bg-primary/10 hover:bg-primary/15"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <Settings2 className="h-3 w-3" />
          Aanpassen
          {hasOverride && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start" sideOffset={8}>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm">Pacing override</h4>
            <p className="text-xs text-muted-foreground">{shiftName} · {date}</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Covers per interval</Label>
              <Input
                type="number"
                min={0}
                placeholder="Standaard"
                value={covers}
                onChange={(e) => setCovers(e.target.value)}
                className={cn("h-8 text-sm", covers && "border-primary text-primary")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Arrivals per interval</Label>
              <Input
                type="number"
                min={0}
                placeholder="Standaard"
                value={arrivals}
                onChange={(e) => setArrivals(e.target.value)}
                className={cn("h-8 text-sm", arrivals && "border-primary text-primary")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Max covers totaal (optioneel)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Geen limiet"
                value={maxTotal}
                onChange={(e) => setMaxTotal(e.target.value)}
                className={cn("h-8 text-sm", maxTotal && "border-primary text-primary")}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Online boeken</Label>
              <Switch
                checked={onlineEnabled}
                onCheckedChange={setOnlineEnabled}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={handleSave}
              disabled={upsert.isPending}
            >
              {upsert.isPending ? "Opslaan..." : "Opslaan"}
            </Button>
            {hasOverride && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={reset.isPending}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
