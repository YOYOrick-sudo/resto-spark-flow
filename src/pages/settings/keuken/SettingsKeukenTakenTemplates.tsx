import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoCard, NestoCardContent, NestoButton } from "@/components/polar";
import { SettingsCardHeader } from "@/components/settings";
import { TemplatesTab } from "@/components/taken/TemplatesTab";
import { useChecklistTemplates } from "@/hooks/useChecklistTemplates";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

/**
 * Templates-subpagina (Fase 5 — uitsplitsing).
 *
 * Pure verplaatsing: TemplatesTab.tsx is NIET aangepast — alleen de mount-locatie
 * is verhuisd van /keuken/taken (sectie 1) naar deze eigen subroute.
 *
 * Seed-card is meeverhuisd: zichtbaar als template-count === 0 (logischer hier
 * dan op de hoofdpagina, want seed = templates aanmaken).
 */
export default function SettingsKeukenTakenTemplates() {
  const { data: templates, seedTemplates } = useChecklistTemplates();
  const templateCount = templates?.length ?? 0;
  const showSeed = !templates || templateCount === 0;

  const breadcrumbs = buildBreadcrumbs("keuken", "taken", undefined, "Templates");

  return (
    <SettingsDetailLayout
      title="Templates"
      description="Beheer checklist-templates die dagelijks of periodiek door de keuken worden uitgevoerd."
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        {/* Templates editor — 1-op-1 hergebruik, geen wijziging */}
        <TemplatesTab />

        {/* Seed — verhuisd vanaf hoofdpagina; alleen zichtbaar bij 0 templates */}
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
