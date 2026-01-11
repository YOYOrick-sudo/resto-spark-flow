import { Clock, Calendar, Timer, Ticket, MapPin, Users, CheckCircle } from "lucide-react";
import { useShiftWizard, MOCK_TICKETS } from "../ShiftWizardContext";
import { DAY_LABELS } from "@/types/shifts";
import { cn } from "@/lib/utils";

interface ReviewSectionProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

function ReviewSection({ icon: Icon, title, children }: ReviewSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{title}</span>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

interface ReviewRowProps {
  label: string;
  value: React.ReactNode;
}

function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
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
    areasByTicket,
    isEditing,
  } = useShiftWizard();

  const formatTime = (time: string) => time.slice(0, 5);
  const formatInterval = (mins: number) => (mins === 60 ? "1 uur" : `${mins} min`);

  const selectedTicketNames = MOCK_TICKETS
    .filter((t) => selectedTickets.includes(t.id))
    .map((t) => t.name);

  // Get areas summary
  const getAreasSummary = () => {
    const customized = Object.entries(areasByTicket).filter(([, config]) => !config.allAreas);
    if (customized.length === 0) {
      return "Alle gebieden beschikbaar";
    }
    return `${customized.length} ticket(s) met aangepaste gebieden`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Overzicht</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Controleer de configuratie van je {isEditing ? "aangepaste" : "nieuwe"} shift voordat je opslaat.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-dropdown border border-border bg-card overflow-hidden">
        {/* Header with shift name and color */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-secondary/50">
          <div
            className="w-4 h-4 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <div>
            <span className="font-semibold text-lg">{name || "Naamloos"}</span>
            {shortName && (
              <span className="ml-2 text-sm text-muted-foreground">({shortName})</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Times */}
          <ReviewSection icon={Clock} title="Tijden">
            <ReviewRow label="Tijd" value={`${formatTime(startTime)} – ${formatTime(endTime)}`} />
          </ReviewSection>

          {/* Days */}
          <ReviewSection icon={Calendar} title="Dagen">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const isActive = daysOfWeek.includes(day);
                return (
                  <span
                    key={day}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
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

          {/* Interval */}
          <ReviewSection icon={Timer} title="Interval">
            <ReviewRow label="Aankomst interval" value={formatInterval(interval)} />
          </ReviewSection>

          {/* Tickets */}
          <ReviewSection icon={Ticket} title="Tickets">
            <div className="space-y-1">
              {selectedTicketNames.map((ticketName) => (
                <div key={ticketName} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>{ticketName}</span>
                </div>
              ))}
            </div>
          </ReviewSection>

          {/* Areas */}
          <ReviewSection icon={MapPin} title="Gebieden">
            <span className="text-sm text-muted-foreground">
              {getAreasSummary()}
            </span>
          </ReviewSection>

          {/* Capacity */}
          <ReviewSection icon={Users} title="Capaciteit">
            <span className="text-sm text-muted-foreground">
              Standaard instellingen (later aanpasbaar)
            </span>
          </ReviewSection>
        </div>
      </div>

      {/* Ready indicator */}
      <div className="flex items-center gap-2 p-3 rounded-dropdown bg-success/10 border border-success/20">
        <CheckCircle className="w-5 h-5 text-success" />
        <span className="text-sm font-medium text-success">
          Shift klaar om {isEditing ? "op te slaan" : "aan te maken"}
        </span>
      </div>
    </div>
  );
}
