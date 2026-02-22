import { useNavigate } from 'react-router-dom';
import { SettingsDetailLayout } from "@/components/settings/layouts";
import { TitleHelp } from "@/components/polar/TitleHelp";
import { EmptyState } from "@/components/polar/EmptyState";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { MessagesSquare, ArrowRight } from "lucide-react";

/**
 * Niveau 4: Notifications settings page
 * Redirects users to Communicatie > Gastberichten (Fase 4.14)
 */
export default function SettingsReserveringenNotificaties() {
  const breadcrumbs = buildBreadcrumbs("reserveringen", "notificaties");
  const navigate = useNavigate();

  return (
    <SettingsDetailLayout
      title={
        <span className="flex items-center gap-2">
          Notificaties
          <TitleHelp title="Hoe werken notificaties?">
            <p className="text-muted-foreground">Automatische berichten naar gasten bij bevestiging, herinnering en annulering.</p>
          </TitleHelp>
        </span>
      }
      description="Configureer e-mail en push notificaties voor reserveringen."
      breadcrumbs={breadcrumbs}
    >
      <div className="max-w-2xl">
        <EmptyState
          icon={MessagesSquare}
          title="Gastberichten zijn verplaatst"
          description="Bevestigingen, reminders en review-verzoeken worden geconfigureerd onder Instellingen > Communicatie > Gastberichten."
          action={{
            label: 'Ga naar Communicatie',
            onClick: () => navigate('/instellingen/communicatie'),
            icon: ArrowRight,
          }}
        />
      </div>
    </SettingsDetailLayout>
  );
}
