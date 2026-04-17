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
import { SectionHeader } from "./_shared";

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
  useEffect(() => {
    if (settings) setFreezeTime(toHm(settings.haccp_freeze_tijd, "03:00"));
  }, [settings]);

  const freezeDirty = useMemo(() => {
    if (!settings) return false;
    return toHm(settings.haccp_freeze_tijd, "03:00") !== freezeTime;
  }, [settings, freezeTime]);

  const handleSaveFreeze = async () => {
    await updateSettings.mutateAsync({
      haccp_freeze_tijd: `${freezeTime}:00`,
    });
    nestoToast.success("HACCP-bevriestijd opgeslagen");
  };

  // ---- Standaard-tijden per type ----
  const [tijden, setTijden] = useState<StandaardTijdenPerType | null>(null);
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
    await updateSettings.mutateAsync({
      standaard_tijden_per_type: tijden,
    });
    nestoToast.success("Standaard-tijden opgeslagen");
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
        {/* SECTIE 1 — Templates */}
        <NestoCard>
          <NestoCardContent>
            <SectionHeader
              title="TEMPLATES"
              description="Beheer checklist-templates die dagelijks of periodiek door de keuken worden uitgevoerd."
            />
            <TemplatesTab />
          </NestoCardContent>
        </NestoCard>

        {/* SECTIE 2 — HACCP-bevriestijd */}
        <NestoCard>
          <NestoCardContent>
            {isLoading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : (
              <>
                <SectionHeader
                  title="HACCP-BEVRIESTIJD"
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
                <div className="border-t border-border/50 pt-5 mt-6">
                  <NestoButton
                    onClick={handleSaveFreeze}
                    disabled={!freezeDirty}
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

        {/* SECTIE 3 — Standaard-tijden per template-type */}
        <NestoCard>
          <NestoCardContent>
            {isLoading || !tijden ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : (
              <>
                <SectionHeader
                  title="STANDAARD-TIJDEN PER TYPE"
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
                <div className="border-t border-border/50 pt-5 mt-6">
                  <NestoButton
                    onClick={handleSaveTijden}
                    disabled={!tijdenDirty}
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

        {/* SECTIE 4 — Seed */}
        {showSeed && (
          <NestoCard>
            <NestoCardContent>
              <SectionHeader
                title="STANDAARD TEMPLATES"
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
