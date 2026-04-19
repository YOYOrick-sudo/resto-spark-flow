import { useEffect, useMemo, useState } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoCard, NestoCardContent, NestoButton, Spinner } from "@/components/polar";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { useKeukenSettings, useUpdateKeukenSettings } from "@/hooks/useKeukenSettings";
import { nestoToast } from "@/lib/nestoToast";
import { InputWithSuffix } from "./_shared";
import { SettingsCardHeader, SettingsSaveIndicator, type SaveState } from "@/components/settings";

export default function SettingsKeukenInkoop() {
  const { data: settings, isLoading } = useKeukenSettings();
  const updateSettings = useUpdateKeukenSettings();

  const [buffer, setBuffer] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    if (settings) setBuffer(String(settings.besteladvies_buffer_percentage ?? 20));
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!settings) return false;
    return String(settings.besteladvies_buffer_percentage ?? 20) !== buffer;
  }, [settings, buffer]);

  const handleSave = async () => {
    setSaveState("saving");
    try {
      await updateSettings.mutateAsync({
        besteladvies_buffer_percentage: parseFloat(buffer) || 20,
      });
      setSaveState("saved");
    } catch (e) {
      setSaveState("error");
      nestoToast.error("Opslaan mislukt", e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <SettingsDetailLayout
      title="Inkoop & Voorraad"
      description="Instellingen voor besteladvies en voorraadberekeningen."
      breadcrumbs={buildBreadcrumbs("keuken", "inkoop")}
    >
      <NestoCard>
        <NestoCardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : (
            <>
              <SettingsCardHeader
                title="Besteladvies"
                description="Configureer hoe ruim het besteladvies wordt berekend."
              />
              <div className="max-w-md">
                <InputWithSuffix
                  label="Extra buffer bovenop het tekort"
                  value={buffer}
                  onChange={setBuffer}
                  suffix="%"
                  helpText="Bij het genereren van besteladvies wordt dit percentage bovenop het berekende tekort opgeteld."
                  step="1"
                />
              </div>
              <div className="border-t border-border/50 pt-5 mt-6 flex items-center gap-3">
                <NestoButton
                  onClick={handleSave}
                  disabled={!isDirty}
                  isLoading={updateSettings.isPending}
                  className="min-h-[44px]"
                >
                  Opslaan
                </NestoButton>
                <SettingsSaveIndicator
                  state={saveState}
                  variant="inline-button"
                  onAutoFade={() => setSaveState("idle")}
                />
              </div>
            </>
          )}
        </NestoCardContent>
      </NestoCard>
    </SettingsDetailLayout>
  );
}
