import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Ban, Clock, Loader2 } from "lucide-react";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoButton } from "@/components/polar/NestoButton";
import { nestoToast } from "@/lib/nestoToast";
import {
  useExceptions,
  useDeleteException,
  toTimeInput,
  type OperatingException,
} from "@/hooks/useOperatingHoursSettings";
import ExceptionModal from "./ExceptionModal";
import BulkHolidaysModal from "./BulkHolidaysModal";

interface Props {
  locationId: string | undefined;
  readOnly: boolean;
}

const dateFmt = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

function formatDate(iso: string): string {
  // YYYY-MM-DD without timezone shift
  const [y, m, d] = iso.split("-").map(Number);
  return dateFmt.format(new Date(y, m - 1, d));
}

export default function ExceptionsTab({ locationId, readOnly }: Props) {
  const { data: exceptions = [], isLoading } = useExceptions(locationId);
  const remove = useDeleteException(locationId);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<OperatingException | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const { upcoming, past } = useMemo(() => {
    const upcoming: OperatingException[] = [];
    const past: OperatingException[] = [];
    for (const e of exceptions) {
      if (e.exception_date >= today) upcoming.push(e);
      else past.push(e);
    }
    past.sort((a, b) => b.exception_date.localeCompare(a.exception_date));
    return { upcoming, past };
  }, [exceptions, today]);

  const handleEdit = (e: OperatingException) => {
    setEditing(e);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    remove.mutate(id, {
      onSuccess: () => nestoToast.success("Afwijking verwijderd"),
      onError: (e: any) => nestoToast.error("Verwijderen mislukt", e?.message),
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {!readOnly && (
          <NestoButton size="sm" variant="primary" onClick={handleNew}>
            <Plus className="h-4 w-4 mr-1" /> Nieuwe afwijking
          </NestoButton>
        )}
        {!readOnly && (
          <NestoButton size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            Bulk feestdagen
          </NestoButton>
        )}
      </div>

      <NestoCard className="p-5">
        <h3 className="text-sm font-semibold mb-3">Aankomende afwijkingen</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Geen geplande afwijkingen.</p>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((e) => (
              <ExceptionRow
                key={e.id}
                exception={e}
                readOnly={readOnly}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </NestoCard>

      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
            Geschiedenis (laatste 30 dagen) — {past.length}
          </summary>
          <NestoCard className="p-5 mt-2">
            <ul className="divide-y divide-border">
              {past.map((e) => (
                <ExceptionRow
                  key={e.id}
                  exception={e}
                  readOnly
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))}
            </ul>
          </NestoCard>
        </details>
      )}

      <ExceptionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        locationId={locationId}
        editing={editing}
      />

      <BulkHolidaysModal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        locationId={locationId}
      />
    </div>
  );
}

function ExceptionRow({
  exception,
  readOnly,
  onEdit,
  onDelete,
}: {
  exception: OperatingException;
  readOnly: boolean;
  onEdit: (e: OperatingException) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = exception.exception_type === "closed" ? Ban : exception.exception_type === "extra" ? Plus : Clock;
  const iconColor =
    exception.exception_type === "closed"
      ? "text-destructive"
      : exception.exception_type === "extra"
      ? "text-success"
      : "text-warning";

  let timeLabel: string;
  if (exception.exception_type === "closed") {
    timeLabel = "Gesloten";
  } else {
    timeLabel = `${toTimeInput(exception.open_time)} – ${toTimeInput(exception.close_time)}`;
  }

  return (
    <li className="flex items-center gap-3 py-2.5">
      <Icon className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
      <div className="text-sm font-medium w-32 flex-shrink-0">{formatDate(exception.exception_date)}</div>
      <div className="text-sm text-foreground w-32 flex-shrink-0">{timeLabel}</div>
      <div className="text-sm text-muted-foreground flex-1 truncate">
        {exception.label || <span className="italic">geen label</span>}
      </div>
      {!readOnly && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(exception)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Bewerk"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(exception.id)}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Verwijder"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}
