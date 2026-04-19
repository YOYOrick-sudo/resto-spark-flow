import { useEffect, useMemo, useState } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoCard, NestoCardContent, NestoButton, NestoSelect, Spinner } from "@/components/polar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock } from "lucide-react";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import {
  useKeukenSettings,
  useUpdateKeukenSettings,
  useUpdateAiBevoegdheden,
  type AiBevoegdheden,
} from "@/hooks/useKeukenSettings";
import { nestoToast } from "@/lib/nestoToast";
import { InputWithSuffix } from "./_shared";
import { SettingsCardHeader } from "@/components/settings";

const AUTONOMY_OPTIONS = [
  { value: "zelfstandig", label: "Zelfstandig" },
  { value: "vraag_eerst", label: "Vraag eerst" },
  { value: "uit", label: "Uit" },
];

const AI_TASKS: { key: keyof Omit<AiBevoegdheden, "haccp_waarschuwingen">; label: string }[] = [
  { key: "prep_lijsten", label: "Prep lijsten genereren" },
  { key: "besteladvies", label: "Besteladvies aanmaken" },
  { key: "interne_transfers", label: "Interne transfers voorstellen" },
  { key: "voorraad_waarschuwingen", label: "Voorraad waarschuwingen" },
];

export default function SettingsKeukenAssistent() {
  const { data: settings, isLoading } = useKeukenSettings();
  const updateSettings = useUpdateKeukenSettings();
  const updateAi = useUpdateAiBevoegdheden();

  const [aiBevoegdheden, setAiBevoegdheden] = useState<AiBevoegdheden | null>(null);
  const [verlopen, setVerlopen] = useState("");
  const [overschot, setOverschot] = useState("");

  useEffect(() => {
    if (settings) {
      setAiBevoegdheden({ ...settings.ai_bevoegdheden_keuken });
      setVerlopen(String(settings.assistent_min_waarde_verlopen ?? 5));
      setOverschot(String(settings.assistent_min_waarde_overschot ?? 10));
    }
  }, [settings]);

  const drempelsDirty = useMemo(() => {
    if (!settings) return false;
    return (
      String(settings.assistent_min_waarde_verlopen ?? 5) !== verlopen ||
      String(settings.assistent_min_waarde_overschot ?? 10) !== overschot
    );
  }, [settings, verlopen, overschot]);

  const handleAiChange = (key: keyof AiBevoegdheden, value: string) => {
    if (key === "haccp_waarschuwingen") return;
    const next = { ...aiBevoegdheden!, [key]: value } as AiBevoegdheden;
    setAiBevoegdheden(next);
    updateAi.mutate(next);
  };

  const handleSaveDrempels = async () => {
    await updateSettings.mutateAsync({
      assistent_min_waarde_verlopen: parseFloat(verlopen) || 5,
      assistent_min_waarde_overschot: parseFloat(overschot) || 10,
    });
    nestoToast.success("Drempelwaarden opgeslagen");
  };

  return (
    <SettingsDetailLayout
      title="Assistent"
      description="Bevoegdheden en drempelwaarden voor de keuken-assistent."
      breadcrumbs={buildBreadcrumbs("keuken", "assistent")}
    >
      <div className="space-y-6">
        {/* Bevoegdheden */}
        <NestoCard>
          <NestoCardContent>
            {isLoading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : (
              <>
                <SettingsCardHeader
                  title="Bevoegdheden"
                  description="Bepaal hoeveel autonomie de Assistent krijgt voor keuken-gerelateerde taken."
                />
                <div className="space-y-1">
                  {AI_TASKS.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-2.5 px-1">
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      <div className="w-[160px]">
                        <NestoSelect
                          value={aiBevoegdheden?.[key] ?? "vraag_eerst"}
                          onValueChange={(v) => handleAiChange(key, v)}
                          options={AUTONOMY_OPTIONS}
                        />
                      </div>
                    </div>
                  ))}
                  <TooltipProvider>
                    <div className="flex items-center justify-between py-2.5 px-1 opacity-60">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">HACCP waarschuwingen</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>HACCP waarschuwingen zijn altijd actief voor voedselveiligheid</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="w-[160px]">
                        <NestoSelect
                          value="zelfstandig"
                          options={[{ value: "zelfstandig", label: "Zelfstandig" }]}
                          disabled
                        />
                      </div>
                    </div>
                  </TooltipProvider>
                </div>
              </>
            )}
          </NestoCardContent>
        </NestoCard>

        {/* Drempelwaarden */}
        <NestoCard>
          <NestoCardContent>
            {isLoading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : (
              <>
                <SettingsCardHeader
                  title="Meldingen"
                  description="Drempelwaarden voor wanneer de Assistent keuken-meldingen toont."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputWithSuffix
                    label="Meld bijna-verlopende items als waarde ≥"
                    value={verlopen}
                    onChange={setVerlopen}
                    suffix="€"
                    step="1"
                    helpText="Items onder deze waarde worden niet gemeld"
                  />
                  <InputWithSuffix
                    label="Meld voorraad overschot als waarde ≥"
                    value={overschot}
                    onChange={setOverschot}
                    suffix="€"
                    step="1"
                    helpText="Overstocked items onder deze waarde worden niet gemeld"
                  />
                </div>
                <div className="border-t border-border/50 pt-5 mt-6">
                  <NestoButton
                    onClick={handleSaveDrempels}
                    disabled={!drempelsDirty}
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
      </div>
    </SettingsDetailLayout>
  );
}
