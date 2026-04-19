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
import {
  SettingsCardHeader,
  SettingsSaveIndicator,
  type SaveState,
} from "@/components/settings";

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

/**
 * SettingsKeukenAssistent — DUAL save-indicator pattern
 * ─────────────────────────────────────────────────────
 * Deze pagina bevat twee fundamenteel verschillende save-flows:
 *
 *  1. AI-Bevoegdheden (NestoSelect dropdowns) → INSTANT-SAVE bij wijziging
 *     → geen Opslaan-knop, dus geen ankerpunt voor inline-button indicator
 *     → variant: "title-bar" via SettingsDetailLayout's `saveIndicator` slot
 *     → state: `aiSaveState`
 *
 *  2. Drempelwaarden (€-velden) → CLICK-TO-SAVE met expliciete Opslaan-knop
 *     → indicator hoort visueel naast de actie-trigger
 *     → variant: "inline-button" naast <NestoButton>
 *     → state: `drempelsSaveState`
 *
 * Beide states zijn onafhankelijk; de varianten verschillen visueel in
 * positie en grootte zodat ze niet conflicteren als ze gelijktijdig actief
 * zouden zijn (zeldzaam — gebruiker doet of-of).
 *
 * Pattern-regel: zie SettingsSaveIndicator JSDoc.
 */
export default function SettingsKeukenAssistent() {
  const { data: settings, isLoading } = useKeukenSettings();
  const updateSettings = useUpdateKeukenSettings();
  const updateAi = useUpdateAiBevoegdheden();

  const [aiBevoegdheden, setAiBevoegdheden] = useState<AiBevoegdheden | null>(null);
  const [verlopen, setVerlopen] = useState("");
  const [overschot, setOverschot] = useState("");

  // Twee onafhankelijke save-states (zie file-header comment).
  const [aiSaveState, setAiSaveState] = useState<SaveState>("idle");
  const [drempelsSaveState, setDrempelsSaveState] = useState<SaveState>("idle");

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

  const handleAiChange = async (key: keyof AiBevoegdheden, value: string) => {
    if (key === "haccp_waarschuwingen") return;
    const next = { ...aiBevoegdheden!, [key]: value } as AiBevoegdheden;
    setAiBevoegdheden(next);
    setAiSaveState("saving");
    try {
      await updateAi.mutateAsync(next);
      setAiSaveState("saved");
    } catch (e) {
      setAiSaveState("error");
      nestoToast.error("Bevoegdheid niet opgeslagen", e instanceof Error ? e.message : undefined);
    }
  };

  const handleSaveDrempels = async () => {
    setDrempelsSaveState("saving");
    try {
      await updateSettings.mutateAsync({
        assistent_min_waarde_verlopen: parseFloat(verlopen) || 5,
        assistent_min_waarde_overschot: parseFloat(overschot) || 10,
      });
      setDrempelsSaveState("saved");
    } catch (e) {
      setDrempelsSaveState("error");
      nestoToast.error("Opslaan mislukt", e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <SettingsDetailLayout
      title="Assistent"
      description="Bevoegdheden en drempelwaarden voor de keuken-assistent."
      breadcrumbs={buildBreadcrumbs("keuken", "assistent")}
      saveIndicator={
        // Title-bar indicator → autosave-flow (toggles/dropdowns zonder Opslaan-knop)
        <SettingsSaveIndicator
          state={aiSaveState}
          variant="title-bar"
          onAutoFade={() => setAiSaveState("idle")}
        />
      }
    >
      <div className="space-y-6">
        {/* Bevoegdheden — instant-save bij dropdown-wijziging */}
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

        {/* Drempelwaarden — click-to-save met inline-button indicator */}
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
                <div className="border-t border-border/50 pt-5 mt-6 flex items-center gap-3">
                  <NestoButton
                    onClick={handleSaveDrempels}
                    disabled={!drempelsDirty}
                    isLoading={updateSettings.isPending}
                    className="min-h-[44px]"
                  >
                    Opslaan
                  </NestoButton>
                  <SettingsSaveIndicator
                    state={drempelsSaveState}
                    variant="inline-button"
                    onAutoFade={() => setDrempelsSaveState("idle")}
                  />
                </div>
              </>
            )}
          </NestoCardContent>
        </NestoCard>
      </div>
    </SettingsDetailLayout>
  );
}
