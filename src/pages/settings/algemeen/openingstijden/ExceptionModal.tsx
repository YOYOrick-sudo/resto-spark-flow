import { useEffect, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NestoInput } from "@/components/polar/NestoInput";
import { cn } from "@/lib/utils";
import { nestoToast } from "@/lib/nestoToast";
import {
  useUpsertException,
  toTimeInput,
  type OperatingException,
  type OperatingExceptionType,
} from "@/hooks/useOperatingHoursSettings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string | undefined;
  editing: OperatingException | null;
}

const TYPE_OPTIONS: { value: OperatingExceptionType; label: string; description: string }[] = [
  { value: "closed", label: "Gesloten", description: "Locatie is dicht op deze dag" },
  { value: "modified", label: "Aangepaste tijden", description: "Andere openingstijden dan normaal" },
  { value: "extra", label: "Extra tijdvak", description: "Bovenop reguliere openingstijden" },
];

export default function ExceptionModal({ open, onOpenChange, locationId, editing }: Props) {
  const upsert = useUpsertException(locationId);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [type, setType] = useState<OperatingExceptionType>("closed");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("23:00");
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (open) {
      if (editing) {
        const [y, m, d] = editing.exception_date.split("-").map(Number);
        setDate(new Date(y, m - 1, d));
        setType(editing.exception_type);
        setOpenTime(toTimeInput(editing.open_time) || "09:00");
        setCloseTime(toTimeInput(editing.close_time) || "23:00");
        setLabel(editing.label ?? "");
      } else {
        setDate(undefined);
        setType("closed");
        setOpenTime("09:00");
        setCloseTime("23:00");
        setLabel("");
      }
    }
  }, [open, editing]);

  const needsTimes = type !== "closed";
  const timesValid = !needsTimes || (openTime && closeTime && closeTime > openTime);
  const canSave = !!date && timesValid && !upsert.isPending;

  const handleSave = () => {
    if (!date) return;
    const isoDate = format(date, "yyyy-MM-dd");
    upsert.mutate(
      {
        id: editing?.id,
        exception_date: isoDate,
        exception_type: type,
        open_time: needsTimes ? `${openTime}:00` : null,
        close_time: needsTimes ? `${closeTime}:00` : null,
        label: label.trim() || null,
      },
      {
        onSuccess: () => {
          nestoToast.success(editing ? "Afwijking bijgewerkt" : "Afwijking aangemaakt");
          onOpenChange(false);
        },
        onError: (e: any) => nestoToast.error("Opslaan mislukt", e?.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Afwijking bewerken" : "Nieuwe afwijking"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Datum</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: nl }) : "Kies een datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={nl}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <div className="grid gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    "text-left px-3 py-2 rounded-md border transition-colors",
                    type === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {needsTimes && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Open</label>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full h-9 px-2 rounded-md border border-border bg-background text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Sluit</label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className={cn(
                    "w-full h-9 px-2 rounded-md border bg-background text-sm",
                    !timesValid ? "border-destructive" : "border-border"
                  )}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Label (optioneel)</label>
            <NestoInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Bijv. Koningsdag"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
