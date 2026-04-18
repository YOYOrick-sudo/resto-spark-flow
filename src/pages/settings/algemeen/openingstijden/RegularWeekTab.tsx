import { useMemo, useState } from "react";
import { Trash2, Loader2, Check, AlertCircle } from "lucide-react";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoButton } from "@/components/polar/NestoButton";
import { nestoToast } from "@/lib/nestoToast";
import {
  useRegularHours,
  useUpsertDayHours,
  useDeleteHourSlot,
  toTimeInput,
  toTimeDb,
  DAY_LABELS,
  type RegularHourSlot,
} from "@/hooks/useOperatingHoursSettings";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { cn } from "@/lib/utils";

interface Props {
  locationId: string | undefined;
  readOnly: boolean;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function RegularWeekTab({ locationId, readOnly }: Props) {
  const { data: slots = [], isLoading } = useRegularHours(locationId);
  const insert = useInsertHourSlot(locationId);
  const update = useUpdateHourSlot(locationId);
  const remove = useDeleteHourSlot(locationId);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const slotsByDay = useMemo(() => {
    const map = new Map<number, RegularHourSlot[]>();
    for (let d = 1; d <= 7; d++) map.set(d, []);
    for (const s of slots) {
      map.get(s.day_of_week)?.push(s);
    }
    return map;
  }, [slots]);

  const flashSaved = () => {
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1500);
  };

  const debouncedUpdate = useDebouncedCallback(
    (id: string, open_time: string, close_time: string) => {
      setSaveStatus("saving");
      update.mutate(
        { id, open_time: toTimeDb(open_time), close_time: toTimeDb(close_time) },
        {
          onSuccess: flashSaved,
          onError: (e: any) => {
            setSaveStatus("error");
            nestoToast.error("Opslaan mislukt", e?.message);
          },
        }
      );
    },
    800
  );

  const handleAddSlot = (day: number) => {
    const existing = slotsByDay.get(day) ?? [];
    const nextSort = existing.length === 0 ? 0 : Math.max(...existing.map((s) => s.sort_order)) + 1;
    setSaveStatus("saving");
    insert.mutate(
      { day_of_week: day, open_time: "12:00:00", close_time: "14:00:00", sort_order: nextSort },
      { onSuccess: flashSaved, onError: () => setSaveStatus("error") }
    );
  };

  const handleOpenDay = (day: number) => {
    setSaveStatus("saving");
    insert.mutate(
      { day_of_week: day, open_time: "09:00:00", close_time: "23:00:00", sort_order: 0 },
      { onSuccess: flashSaved, onError: () => setSaveStatus("error") }
    );
  };

  const handleDelete = (id: string) => {
    setSaveStatus("saving");
    remove.mutate(id, {
      onSuccess: flashSaved,
      onError: () => setSaveStatus("error"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <NestoCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Reguliere week</h3>
        <SaveStatusBadge status={saveStatus} />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => {
          const daySlots = slotsByDay.get(day) ?? [];
          const isClosed = daySlots.length === 0;

          return (
            <div key={day} className="grid grid-cols-[120px_1fr] gap-3 items-start py-2 border-b border-border last:border-0">
              <div className="text-sm font-medium pt-2">{DAY_LABELS[day]}</div>
              <div className="space-y-2">
                {isClosed ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground italic">Gesloten</span>
                    {!readOnly && (
                      <NestoButton size="sm" variant="outline" onClick={() => handleOpenDay(day)}>
                        Open op deze dag
                      </NestoButton>
                    )}
                  </div>
                ) : (
                  <>
                    {daySlots.map((slot) => (
                      <SlotRow
                        key={slot.id}
                        slot={slot}
                        readOnly={readOnly}
                        onChange={debouncedUpdate}
                        onDelete={handleDelete}
                      />
                    ))}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleAddSlot(day)}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Tijdvak toevoegen
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </NestoCard>
  );
}

function SlotRow({
  slot,
  readOnly,
  onChange,
  onDelete,
}: {
  slot: RegularHourSlot;
  readOnly: boolean;
  onChange: (id: string, open: string, close: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(toTimeInput(slot.open_time));
  const [close, setClose] = useState(toTimeInput(slot.close_time));

  const invalid = !!open && !!close && close <= open;

  const emit = (o: string, c: string) => {
    if (!o || !c) return;
    if (c <= o) return;
    onChange(slot.id, o, c);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="time"
        value={open}
        disabled={readOnly}
        onChange={(e) => {
          setOpen(e.target.value);
          emit(e.target.value, close);
        }}
        className={cn(
          "h-8 px-2 rounded-md border bg-background text-sm",
          invalid ? "border-destructive" : "border-border"
        )}
      />
      <span className="text-xs text-muted-foreground">–</span>
      <input
        type="time"
        value={close}
        disabled={readOnly}
        onChange={(e) => {
          setClose(e.target.value);
          emit(open, e.target.value);
        }}
        className={cn(
          "h-8 px-2 rounded-md border bg-background text-sm",
          invalid ? "border-destructive" : "border-border"
        )}
      />
      {!readOnly && (
        <button
          type="button"
          onClick={() => onDelete(slot.id)}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Verwijder tijdvak"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {invalid && (
        <span className="text-xs text-destructive">Eindtijd moet na starttijd liggen</span>
      )}
    </div>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  if (status === "saving")
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" /> Opslaan…
      </span>
    );
  if (status === "saved")
    return (
      <span className="text-xs text-success flex items-center gap-1.5">
        <Check className="h-3 w-3" /> Opgeslagen
      </span>
    );
  return (
    <span className="text-xs text-destructive flex items-center gap-1.5">
      <AlertCircle className="h-3 w-3" /> Fout bij opslaan
    </span>
  );
}
