import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { useUserContext } from "@/contexts/UserContext";
import RegularWeekTab from "./RegularWeekTab";
import ExceptionsTab from "./ExceptionsTab";

export default function OpeningHoursPage() {
  const { currentLocation, context } = useUserContext();
  const [tab, setTab] = useState("regulier");

  const role = context?.role as string | undefined;
  const canEdit = role === "owner" || role === "manager" || context?.is_platform_admin === true;

  return (
    <SettingsDetailLayout
      title="Openingstijden"
      description="Wanneer is deze locatie open? Deze informatie wordt door alle modules gebruikt."
      breadcrumbs={buildBreadcrumbs("algemeen", "openingstijden")}
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Deze openingstijden worden gebruikt door: Taken logboek, Reserveringen, Bestellingen, Marketing.
        </p>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="regulier">Reguliere week</TabsTrigger>
            <TabsTrigger value="bijzonder">Bijzondere dagen</TabsTrigger>
          </TabsList>
          <TabsContent value="regulier" className="mt-4">
            <RegularWeekTab locationId={currentLocation?.id} readOnly={!canEdit} />
          </TabsContent>
          <TabsContent value="bijzonder" className="mt-4">
            <ExceptionsTab locationId={currentLocation?.id} readOnly={!canEdit} />
          </TabsContent>
        </Tabs>
      </div>
    </SettingsDetailLayout>
  );
}
