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
    <div className="flex items-start gap-4 p-4 rounded-dropdown border border-border bg-card">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          {comingSoon && (
            <NestoBadge variant="soon" className="text-xs">
              Coming soon
            </NestoBadge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {description}
        </p>
        {linkText && linkTo && !comingSoon && (
          <a
            href={linkTo}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
          >
            {linkText}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {comingSoon && (
          <button
            type="button"
            disabled
            className="text-sm text-muted-foreground mt-2 cursor-not-allowed"
          >
            Configureren
          </button>
        )}
      </div>
    </div>
  );
}

export function CapacityStep() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Capaciteit & regels</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Geavanceerde capaciteitsregels en beperkingen voor deze shift. Deze instellingen kunnen later worden geconfigureerd.
        </p>
      </div>

      {/* Capacity cards */}
      <div className="space-y-3">
        <CapacityCard
          icon={Clock}
          title="Reserveringsduur"
          description="Standaard: 90 minuten per reservering"
          comingSoon
        />

        <CapacityCard
          icon={Users}
          title="Pacing limieten"
          description="Maximum aantal gasten per tijdslot"
          linkText="Naar pacing instellingen"
          linkTo="/instellingen/reserveringen/pacing"
        />

        <CapacityCard
          icon={Grid3X3}
          title="Gebieden"
          description="Alle gebieden zijn standaard beschikbaar"
          linkText="Naar tafelinstellingen"
          linkTo="/instellingen/reserveringen/tafels"
        />
      </div>

      {/* Info */}
      <InfoAlert
        variant="info"
        title="Geavanceerde configuratie"
        description="Geavanceerde regels zoals reserveringsduur per ticket en shift-specifieke capaciteit kunnen later worden geconfigureerd in de shift detail pagina."
      />
    </div>
  );
}
