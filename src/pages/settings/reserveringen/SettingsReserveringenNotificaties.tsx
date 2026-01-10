import { SettingsDetailLayout } from "@/components/settings/layouts";
import { NestoCard } from "@/components/polar/NestoCard";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

/**
 * Niveau 4: Notifications settings page
 */
export default function SettingsReserveringenNotificaties() {
  const breadcrumbs = buildBreadcrumbs("reserveringen", "notificaties");

  return (
    <SettingsDetailLayout
      title="Notificaties"
      description="Configureer e-mail en push notificaties voor reserveringen."
      backTo="/instellingen/reserveringen"
      backLabel="Reserveringen"
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
