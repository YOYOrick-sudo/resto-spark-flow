import { SettingsDetailLayout } from "@/components/settings/layouts";
import { NestoCard } from "@/components/polar/NestoCard";
import { TitleHelp } from "@/components/polar/TitleHelp";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

/**
 * Niveau 4: Notifications settings page
 */
export default function SettingsReserveringenNotificaties() {
  const breadcrumbs = buildBreadcrumbs("reserveringen", "notificaties");

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
        <NestoCard className="p-6">
          <p className="text-muted-foreground">Notificatie instellingen komen hier.</p>
        </NestoCard>
      </div>
    </SettingsDetailLayout>
  );
}
