import { useEffect, useMemo, useState } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoCard, NestoCardContent, NestoButton, Spinner } from "@/components/polar";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import {
  useKeukenSettings,
  useUpdateKeukenSettings,
  type StandaardTijdenPerType,
} from "@/hooks/useKeukenSettings";
import { useChecklistTemplates } from "@/hooks/useChecklistTemplates";
import { nestoToast } from "@/lib/nestoToast";
import { TemplatesTab } from "@/components/taken/TemplatesTab";
import {
  SettingsCardHeader,
  SettingsSectionLabel,
  SettingsSaveIndicator,
  type SaveState,
} from "@/components/settings";

const TYPE_LABELS: Record<keyof StandaardTijdenPerType, string> = {
  opening: "Opening",
  tussentijds: "Tussentijds",
  sluiting: "Sluiting",
  schoonmaak: "Schoonmaak",
  haccp: "HACCP",
};

const TYPE_ORDER: (keyof StandaardTijdenPerType)[] = [
  "opening",
  "tussentijds",
  "sluiting",
  "schoonmaak",
  "haccp",
];

/** Normalize HH:MM:SS or HH:MM → HH:MM for time inputs. */
function toHm(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const parts = value.split(":");
  if (parts.length >= 2) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  return fallback;
}

export default function SettingsKeukenTaken() {
  const { data: settings, isLoading } = useKeukenSettings();
  const updateSettings = useUpdateKeukenSettings();
  const { data: templates, seedTemplates } = useChecklistTemplates();

  // ---- HACCP-bevriestijd ----
  const [freezeTime, setFreezeTime] = useState("03:00");
  const [freezeSaveState, setFreezeSaveState] = useState<SaveState>("idle");
  useEffect(() => {
    if (settings) setFreezeTime(toHm(settings.haccp_freeze_tijd, "03:00"));
  }, [settings]);

  const freezeDirty = useMemo(() => {
    if (!settings) return false;
    return toHm(settings.haccp_freeze_tijd, "03:00") !== freezeTime;
  }, [settings, freezeTime]);

  const handleSaveFreeze = async () => {
    setFreezeSaveState("saving");
    try {
      await updateSettings.mutateAsync({
        haccp_freeze_tijd: `${freezeTime}:00`,
      });
      setFreezeSaveState("saved");
    } catch (e) {
      setFreezeSaveState("error");
      nestoToast.error("Opslaan mislukt", { description: e instanceof Error ? e.message : undefined });
    }
  };

  // ---- Standaard-tijden per type ----
  const [tijden, setTijden] = useState<StandaardTijdenPerType | null>(null);
  const [tijdenSaveState, setTijdenSaveState] = useState<SaveState>("idle");
  useEffect(() => {
    if (settings) {
      setTijden({
        opening: toHm(settings.standaard_tijden_per_type.opening, "07:00"),
        tussentijds: toHm(settings.standaard_tijden_per_type.tussentijds, "13:00"),
        sluiting: toHm(settings.standaard_tijden_per_type.sluiting, "22:00"),
        schoonmaak: toHm(settings.standaard_tijden_per_type.schoonmaak, "09:00"),
        haccp: toHm(settings.standaard_tijden_per_type.haccp, "10:00"),
      });
    }
  }, [settings]);

  const tijdenDirty = useMemo(() => {
    if (!settings || !tijden) return false;
    return TYPE_ORDER.some(
      (k) => toHm(settings.standaard_tijden_per_type[k], tijden[k]) !== tijden[k]
    );
  }, [settings, tijden]);

  const handleSaveTijden = async () => {
    if (!tijden) return;
    setTijdenSaveState("saving");
    try {
      await updateSettings.mutateAsync({
        standaard_tijden_per_type: tijden,
      });
      setTijdenSaveState("saved");
    } catch (e) {
      setTijdenSaveState("error");
      nestoToast.error("Opslaan mislukt", { description: e instanceof Error ? e.message : undefined });
    }
  };

  // ---- Seed ----
  const templateCount = templates?.length ?? 0;
  const showSeed = !templates || templateCount === 0;

  return (
    <SettingsDetailLayout
      title="Taken & HACCP"
      description="Instellingen voor checklists, periodieke taken en HACCP-historie."
      breadcrumbs={buildBreadcrumbs("keuken", "taken")}
    >
      <div className="space-y-6">
        {/* SECTIE 1 — Templates (geen card-wrapper voor extra editor-breedte) */}
        <div className="space-y-4">
          <SettingsSectionLabel>TEMPLATES</SettingsSectionLabel>
          <p className="text-sm text-muted-foreground -mt-3">
            Beheer checklist-templates die dagelijks of periodiek door de keuken worden uitgevoerd.
          </p>
          <TemplatesTab />
        </div>

        {/* SECTIE 2 — HACCP-bevriestijd */}
        <NestoCard>
          <NestoCardContent>
            {isLoading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : (
              <>
                <SettingsCardHeader
                  title="HACCP-bevriestijd"
                  description="Tijdstip waarop runs van de vorige dag definitief worden vergrendeld voor HACCP-historie."
                />
                <div className="max-w-xs">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Bevriestijd
                  </label>
                  <input
                    type="time"
                    value={freezeTime}
                    onChange={(e) => setFreezeTime(e.target.value)}
                    className="h-11 w-full rounded-button border-[1.5px] border-border bg-card px-3 text-sm text-foreground tabular-nums focus:!border-primary focus:outline-none focus:ring-0"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Na deze tijd kunnen runs van de vorige dag niet meer worden aangepast (HACCP-compliance).
                  </p>
                </div>
                <div className="border-t border-border/50 pt-5 mt-6 flex items-center gap-3">
                  <NestoButton
                    onClick={handleSaveFreeze}
                    disabled={!freezeDirty}
                    isLoading={updateSettings.isPending}
                    className="min-h-[44px]"
                  >
                    Opslaan
                  </NestoButton>
                  <SettingsSaveIndicator
                    state={freezeSaveState}
                    variant="inline-button"
                    onAutoFade={() => setFreezeSaveState("idle")}
                  />
                </div>
              </>
            )}
          </NestoCardContent>
        </NestoCard>

        {/* SECTIE 3 — Standaard-tijden per template-type */}
        <NestoCard>
          <NestoCardContent>
            {isLoading || !tijden ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : (
              <>
                <SettingsCardHeader
                  title="Standaard-tijden per type"
                  description="Wordt gebruikt als suggestie bij nieuwe templates en voor sortering op de tijdlijn."
                />
                <div className="border border-border rounded-lg overflow-hidden divide-y divide-border bg-card">
                  {TYPE_ORDER.map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {TYPE_LABELS[key]}
                      </span>
                      <input
                        type="time"
                        value={tijden[key]}
                        onChange={(e) =>
                          setTijden((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))
                        }
                        className="h-9 w-32 rounded-button border-[1.5px] border-border bg-background px-3 text-sm text-foreground tabular-nums focus:!border-primary focus:outline-none focus:ring-0"
                      />
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/50 pt-5 mt-6 flex items-center gap-3">
                  <NestoButton
                    onClick={handleSaveTijden}
                    disabled={!tijdenDirty}
                    isLoading={updateSettings.isPending}
                    className="min-h-[44px]"
                  >
                    Opslaan
                  </NestoButton>
                  <SettingsSaveIndicator
                    state={tijdenSaveState}
                    variant="inline-button"
                    onAutoFade={() => setTijdenSaveState("idle")}
                  />
                </div>
              </>
            )}
          </NestoCardContent>
        </NestoCard>

        {/* SECTIE 4 — Seed (create-actie → nestoToast blijft via hook) */}
        {showSeed && (
          <NestoCard>
            <NestoCardContent>
              <SettingsCardHeader
                title="Standaard templates"
                description="Maakt 3 starter-templates aan: Opening, Sluiting, Schoonmaak wekelijks."
              />
              <NestoButton
                onClick={() => seedTemplates.mutate()}
                isLoading={seedTemplates.isPending}
                className="min-h-[44px]"
              >
                Standaard templates aanmaken
              </NestoButton>
            </NestoCardContent>
          </NestoCard>
        )}
      </div>
    </SettingsDetailLayout>
  );
}
