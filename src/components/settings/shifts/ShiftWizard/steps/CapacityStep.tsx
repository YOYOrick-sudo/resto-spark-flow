import { ExternalLink, Clock, Users, Grid3X3 } from "lucide-react";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { InfoAlert } from "@/components/polar/InfoAlert";
import { cn } from "@/lib/utils";

interface CapacityCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  linkText?: string;
  linkTo?: string;
  comingSoon?: boolean;
}

function CapacityCard({ icon: Icon, title, description, linkText, linkTo, comingSoon }: CapacityCardProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-dropdown border border-border bg-card">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {comingSoon && (
            <NestoBadge variant="soon" className="text-xs">
              Coming soon
            </NestoBadge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {linkText && linkTo && !comingSoon && (
          <a
            href={linkTo}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            {linkText}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export function CapacityStep() {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Capaciteit & regels</h3>

      {/* Capacity cards */}
      <div className="space-y-2">
        <CapacityCard
          icon={Clock}
          title="Reserveringsduur"
          description="Standaard: 90 minuten per reservering"
          comingSoon
        />

        <CapacityCard
          icon={Users}
          title="Pacing limieten"
          description="Maximum gasten per tijdslot"
          linkText="Naar pacing"
          linkTo="/instellingen/reserveringen/pacing"
        />

        <CapacityCard
          icon={Grid3X3}
          title="Gebieden"
          description="Alle gebieden beschikbaar"
          linkText="Naar tafels"
          linkTo="/instellingen/reserveringen/tafels"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Geavanceerde regels kunnen later worden geconfigureerd.
      </p>
    </div>
  );
}
