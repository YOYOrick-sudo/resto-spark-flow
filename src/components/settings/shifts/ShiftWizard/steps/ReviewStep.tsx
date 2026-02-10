import { Clock, Calendar, Timer, Ticket, Settings2, Users, CheckCircle } from "lucide-react";
import { useShiftWizard } from "../ShiftWizardContext";
import { useTickets } from "@/hooks/useTickets";
import { DAY_LABELS } from "@/types/shifts";
import { cn } from "@/lib/utils";

interface ReviewSectionProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

function ReviewSection({ icon: Icon, title, children }: ReviewSectionProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export function ReviewStep() {
  const {
    name,
    shortName,
    startTime,
    endTime,
    daysOfWeek,
    interval,
    color,
    selectedTickets,
    locationId,
    isEditing,
  } = useShiftWizard();

  const { data } = useTickets(locationId);
  const allTickets = data?.visibleTickets ?? [];

  const formatTime = (time: string) => time.slice(0, 5);
  const formatInterval = (mins: number) => (mins === 60 ? "1 uur" : `${mins} min`);

  const selectedTicketNames = allTickets
    .filter((t) => selectedTickets.includes(t.id))
    .map((t) => t.display_title);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Overzicht</h3>

      <div className="rounded-dropdown border border-border bg-card overflow-hidden">
        {/* Header with shift name and color */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-secondary/50">
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold">{name || "Naamloos"}</span>
          {shortName && (
            <span className="text-sm text-muted-foreground">({shortName})</span>
          )}
        </div>

        <div className="px-4 py-3 divide-y divide-border">
          <ReviewSection icon={Clock} title="Tijden">
            <span className="text-sm font-medium">{formatTime(startTime)} – {formatTime(endTime)}</span>
          </ReviewSection>

          <ReviewSection icon={Calendar} title="Dagen">
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const isActive = daysOfWeek.includes(day);
                return (
                  <span
                    key={day}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {DAY_LABELS[day]}
                  </span>
                );
              })}
            </div>
          </ReviewSection>

          <ReviewSection icon={Timer} title="Interval">
            <span className="text-sm font-medium">{formatInterval(interval)}</span>
          </ReviewSection>

          <ReviewSection icon={Ticket} title="Tickets">
            <span className="text-sm font-medium">
              {selectedTicketNames.length > 0 ? selectedTicketNames.join(", ") : "Geen"}
            </span>
          </ReviewSection>

          <ReviewSection icon={Settings2} title="Configuratie">
            <span className="text-sm text-muted-foreground">Standaard</span>
          </ReviewSection>

          <ReviewSection icon={Users} title="Capaciteit">
            <span className="text-sm text-muted-foreground">Standaard</span>
          </ReviewSection>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-button bg-success/10 border border-success/20">
        <CheckCircle className="w-4 h-4 text-success" />
        <span className="text-sm font-medium text-success">
          Klaar om {isEditing ? "op te slaan" : "aan te maken"}
        </span>
      </div>
    </div>
  );
}
