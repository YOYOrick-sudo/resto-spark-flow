import { useEffect, useMemo, useState } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoCard, NestoCardContent, NestoButton, Spinner } from "@/components/polar";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { useKeukenSettings, useUpdateKeukenSettings } from "@/hooks/useKeukenSettings";
import { nestoToast } from "@/lib/nestoToast";
import { InputWithSuffix, SectionHeader } from "./_shared";

export default function SettingsKeukenHaccp() {
  const { data: settings, isLoading } = useKeukenSettings();
  const updateSettings = useUpdateKeukenSettings();

  const [koelingMax, setKoelingMax] = useState("");
  const [vriezerMax, setVriezerMax] = useState("");
  const [kernMin, setKernMin] = useState("");
  const [warmhoudenMin, setWarmhoudenMin] = useState("");

  useEffect(() => {
    if (settings) {
      setKoelingMax(String(settings.haccp_koeling_max ?? 7));
      setVriezerMax(String(settings.haccp_vriezer_max ?? -18));
      setKernMin(String(settings.haccp_kern_min ?? 75));
      setWarmhoudenMin(String(settings.haccp_warmhouden_min ?? 60));
    }
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!settings) return false;
    return (
      String(settings.haccp_koeling_max ?? 7) !== koelingMax ||
      String(settings.haccp_vriezer_max ?? -18) !== vriezerMax ||
      String(settings.haccp_kern_min ?? 75) !== kernMin ||
      String(settings.haccp_warmhouden_min ?? 60) !== warmhoudenMin
    );
  }, [settings, koelingMax, vriezerMax, kernMin, warmhoudenMin]);

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      haccp_koeling_max: parseFloat(koelingMax) || 7,
      haccp_vriezer_max: parseFloat(vriezerMax) || -18,
      haccp_kern_min: parseFloat(kernMin) || 75,
      haccp_warmhouden_min: parseFloat(warmhoudenMin) || 60,
    });
    nestoToast.success("Temperatuur-grenzen opgeslagen");
  };

  return (
    <SettingsDetailLayout
      title="HACCP Temperatuur"
      description="Standaard grenzen voor temperatuurcontroles."
      breadcrumbs={buildBreadcrumbs("keuken", "haccp")}
    >
      <NestoCard>
        <NestoCardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : (
            <>
              <SectionHeader
                title="TEMPERATUURGRENZEN"
                description="Waarden buiten deze grenzen worden rood gemarkeerd en vereisen actie."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputWithSuffix label="Koeling maximaal" value={koelingMax} onChange={setKoelingMax} suffix="°C" step="0.1" />
                <InputWithSuffix label="Vriezer maximaal" value={vriezerMax} onChange={setVriezerMax} suffix="°C" step="0.1" />
                <InputWithSuffix label="Kern minimum" value={kernMin} onChange={setKernMin} suffix="°C" step="0.1" />
                <InputWithSuffix label="Warmhouden minimum" value={warmhoudenMin} onChange={setWarmhoudenMin} suffix="°C" step="0.1" />
              </div>
              <div className="border-t border-border/50 pt-5 mt-6">
                <NestoButton
                  onClick={handleSave}
                  disabled={!isDirty}
                  isLoading={updateSettings.isPending}
                  className="min-h-[44px]"
                >
                  Opslaan
                </NestoButton>
              </div>
            </>
          )}
        </NestoCardContent>
      </NestoCard>
    </SettingsDetailLayout>
  );
}
